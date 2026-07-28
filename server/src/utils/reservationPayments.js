import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { mapFedaPayStatus, retrieveFedaPayTransaction } from '../services/fedapay.js'
import { broadcastPaymentEvent } from '../services/paymentEvents.js'
import { logger } from './logger.js'

function sanitizeHttpUrl(value) {
  const raw = String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function callbackBase() {
  const candidates = [
    process.env.FEDAPAY_CALLBACK_URL,
    process.env.CLIENT_URL,
    process.env.API_PUBLIC_URL,
    'https://monpermis.bj',
    'https://monpermis-api.onrender.com',
  ]
  for (const candidate of candidates) {
    const cleaned = sanitizeHttpUrl(candidate)
    if (!cleaned) continue
    if (/monpermis-admin/i.test(cleaned)) continue
    return cleaned.replace(/\/abonnement\/?$/, '')
  }
  return 'https://monpermis.bj'
}

export function buildReservationCallbackUrl(bookingGroupId) {
  const url = new URL(`${callbackBase()}/conduite/reservation`)
  if (bookingGroupId) url.searchParams.set('bookingGroup', String(bookingGroupId))
  return url.toString()
}

/**
 * Chemin parallèle à applyApprovedAccessPayment/applyFailedAccessPayment
 * (server/src/utils/accessRequests.js) : mêmes garanties d'idempotence et de
 * diffusion SSE, mais ciblant des Reservation regroupées par bookingGroupId
 * au lieu d'AccessRequest — sémantique différente (pending_payment -> confirmed).
 */

async function broadcastReservationPaymentUpdate(payment, reservations) {
  try {
    const learner = await User.findById(payment.userId).select('firstName lastName email phone')
    broadcastPaymentEvent({
      type: 'reservation_payment.updated',
      payment: {
        ...payment.toPublicJSON(),
        learner: learner
          ? {
              id: learner._id,
              firstName: learner.firstName,
              lastName: learner.lastName,
              email: learner.email || '',
              phone: learner.phone || '',
            }
          : null,
      },
      bookingGroupId: payment.reservationGroupId ? String(payment.reservationGroupId) : null,
      reservations: reservations.map((r) => r.toJSONSafe()),
    })
  } catch (error) {
    logger.error('Diffusion paiement réservation échouée', { error: error.message })
  }
}

const STALE_PENDING_MS = 30 * 60 * 1000

/** Libère les réservations bloquées en pending_payment depuis trop longtemps (paiement jamais abouti). */
export async function expireStalePendingReservations() {
  const threshold = new Date(Date.now() - STALE_PENDING_MS)
  const stale = await Reservation.find({
    status: 'pending_payment',
    createdAt: { $lt: threshold },
  })

  let releasedCount = 0
  for (const reservation of stale) {
    reservation.status = 'cancelled'
    reservation.paymentStatus = 'unpaid'
    reservation.cancelledAt = new Date()
    reservation.cancelledBy = 'admin'
    reservation.cancellationReason = 'Paiement non abouti (délai dépassé)'
    await reservation.save()
    await Creneau.findByIdAndUpdate(reservation.creneauId, {
      status: 'libre',
      lockedUntil: null,
      lockedBy: null,
    })
    releasedCount += 1
  }

  return releasedCount
}

export async function applyApprovedReservationPayment(
  payment,
  { eventName = '', eventId = '', raw = null } = {},
) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true, reservations: [] }
  }

  payment.status = 'approved'
  payment.lastEventName = eventName || payment.lastEventName
  payment.rawLastEvent = raw
  payment.activatedAt = new Date()
  if (eventId) payment.processedEventIds.push(String(eventId))
  await payment.save()

  if (!payment.reservationGroupId) {
    const error = new Error('Réservation liée introuvable')
    error.status = 404
    throw error
  }

  const pending = await Reservation.find({
    bookingGroupId: payment.reservationGroupId,
    status: 'pending_payment',
  })

  for (const reservation of pending) {
    reservation.status = 'confirmed'
    reservation.paymentStatus = 'paid'
    reservation.paymentRef = payment.fedapayReference || payment.fedapayTransactionId || ''
    await reservation.save()
  }

  const reservations = await Reservation.find({ bookingGroupId: payment.reservationGroupId })
  void broadcastReservationPaymentUpdate(payment, reservations)

  if (!reservations.length) {
    const error = new Error('Réservation liée introuvable')
    error.status = 404
    throw error
  }

  return { payment, reservations, alreadyProcessed: false }
}

export async function applyFailedReservationPayment(
  payment,
  status,
  { eventName = '', eventId = '', raw = null, message = '' } = {},
) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true, reservations: [] }
  }

  payment.status = status
  payment.lastEventName = eventName || payment.lastEventName
  payment.errorMessage = message || payment.errorMessage
  payment.rawLastEvent = raw
  if (eventId) payment.processedEventIds.push(String(eventId))
  await payment.save()

  const pending = payment.reservationGroupId
    ? await Reservation.find({
        bookingGroupId: payment.reservationGroupId,
        status: 'pending_payment',
      })
    : []

  for (const reservation of pending) {
    reservation.status = 'cancelled'
    reservation.paymentStatus = 'unpaid'
    reservation.cancelledAt = new Date()
    reservation.cancelledBy = 'admin'
    reservation.cancellationReason = message || 'Paiement échoué'
    await reservation.save()
    await Creneau.findByIdAndUpdate(reservation.creneauId, {
      status: 'libre',
      lockedUntil: null,
      lockedBy: null,
    })
  }

  const reservations = payment.reservationGroupId
    ? await Reservation.find({ bookingGroupId: payment.reservationGroupId })
    : []
  void broadcastReservationPaymentUpdate(payment, reservations)

  return { payment, reservations, alreadyProcessed: false }
}

/** Réconciliation pull (miroir syncAccessPaymentFromProvider) — utilisée par le poll client. */
export async function syncReservationPaymentFromProvider(payment) {
  if (payment.method !== 'fedapay' || !payment.fedapayTransactionId) return payment
  const remote = await retrieveFedaPayTransaction(payment.fedapayTransactionId)
  const mapped = mapFedaPayStatus(remote.status)
  payment.fedapayReference = remote.reference || payment.fedapayReference
  const remoteMode = String(remote.mode || '').toLowerCase()
  if (remoteMode === 'mtn_open') payment.paymentMethod = 'mtn'
  else if (remoteMode === 'sbin') payment.paymentMethod = 'celtiis'
  else if (remoteMode === 'moov') payment.paymentMethod = 'moov'
  else if (remoteMode) payment.paymentMethod = remoteMode

  if (mapped === 'approved') {
    await applyApprovedReservationPayment(payment, { eventName: 'transaction.synced', raw: remote })
  } else if (mapped === 'declined' || mapped === 'canceled' || mapped === 'failed') {
    const code = String(remote.last_error_code || '').toUpperCase()
    let message =
      mapped === 'declined' ? 'Paiement refusé' : mapped === 'canceled' ? 'Paiement annulé' : 'Paiement échoué'
    if (code === 'ACCOUNT_NOT_FOUND') {
      message = 'Ce numéro n’a pas de compte Mobile Money sur le réseau choisi. Vérifie MTN / Moov / Celtiis.'
    } else if (code === 'API_ERROR') {
      message = 'Le réseau Mobile Money a refusé le retrait. Vérifie que tu as choisi le bon opérateur pour ce numéro.'
    }
    await applyFailedReservationPayment(payment, mapped, {
      eventName: 'transaction.synced',
      message,
      raw: remote,
    })
  } else {
    payment.status = 'pending'
    await payment.save()
  }

  return Payment.findById(payment._id)
}
