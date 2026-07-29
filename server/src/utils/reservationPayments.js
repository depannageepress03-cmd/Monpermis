import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  cancelFedaPayTransaction,
  mapFedaPayStatus,
  retrieveFedaPayTransaction,
} from '../services/fedapay.js'
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

async function releaseReservationSlot(reservation, { reason, cancelledBy = 'admin' }) {
  reservation.status = 'cancelled'
  reservation.paymentStatus = 'unpaid'
  reservation.cancelledAt = new Date()
  reservation.cancelledBy = cancelledBy
  reservation.cancellationReason = reason
  await reservation.save()
  await Creneau.findByIdAndUpdate(reservation.creneauId, {
    status: 'libre',
    lockedUntil: null,
    lockedBy: null,
  })
}

/**
 * Void FedaPay + annule atomiquement un Payment de réservation encore pending.
 * Si la tx est déjà payée, réconcilie au lieu d’annuler.
 */
export async function cancelPendingReservationPayment(payment, note) {
  if (!payment || payment.status !== 'pending') {
    return { payment, paidAlready: false }
  }

  if (payment.method === 'fedapay' && payment.fedapayTransactionId) {
    const voidResult = await cancelFedaPayTransaction(payment.fedapayTransactionId)
    if (voidResult.reason === 'already_paid') {
      try {
        await syncReservationPaymentFromProvider(payment)
      } catch (error) {
        logger.warn('Réconciliation réservation after already_paid échouée', {
          error: error.message,
          paymentId: String(payment._id),
        })
      }
      return { payment: await Payment.findById(payment._id), paidAlready: true }
    }
    if (!voidResult.canceled) {
      logger.warn('Void FedaPay réservation échoué', {
        paymentId: String(payment._id),
        reason: voidResult.reason,
        error: voidResult.error || null,
      })
    }
  }

  const canceled = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'pending' },
    { $set: { status: 'canceled', errorMessage: note } },
    { new: true },
  )
  return { payment: canceled || (await Payment.findById(payment._id)), paidAlready: false }
}

/** Libère les réservations bloquées en pending_payment depuis trop longtemps (paiement jamais abouti). */
export async function expireStalePendingReservations() {
  const threshold = new Date(Date.now() - STALE_PENDING_MS)
  const stale = await Reservation.find({
    status: 'pending_payment',
    createdAt: { $lt: threshold },
  })

  let releasedCount = 0
  const handledGroups = new Set()

  for (const reservation of stale) {
    const groupKey = reservation.bookingGroupId ? String(reservation.bookingGroupId) : null
    if (groupKey && handledGroups.has(groupKey)) continue
    if (groupKey) handledGroups.add(groupKey)

    const note = 'Paiement non abouti (délai dépassé)'

    if (groupKey) {
      const payment = await Payment.findOne({
        reservationGroupId: reservation.bookingGroupId,
        status: 'pending',
        method: 'fedapay',
      }).sort({ createdAt: -1 })

      if (payment) {
        const result = await cancelPendingReservationPayment(payment, note)
        if (result.paidAlready) {
          // Paiement abouti entre-temps — ne pas libérer les créneaux.
          continue
        }
      }

      const siblings = await Reservation.find({
        bookingGroupId: reservation.bookingGroupId,
        status: 'pending_payment',
      })
      for (const sibling of siblings) {
        await releaseReservationSlot(sibling, { reason: note, cancelledBy: 'admin' })
        releasedCount += 1
      }
    } else {
      await releaseReservationSlot(reservation, { reason: note, cancelledBy: 'admin' })
      releasedCount += 1
    }
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

  if (payment.status === 'approved') {
    if (eventId) {
      await Payment.findByIdAndUpdate(payment._id, {
        $addToSet: { processedEventIds: String(eventId) },
        $set: { lastEventName: eventName || payment.lastEventName, rawLastEvent: raw },
      })
    }
    const reservations = payment.reservationGroupId
      ? await Reservation.find({ bookingGroupId: payment.reservationGroupId })
      : []
    return { payment: await Payment.findById(payment._id), alreadyProcessed: true, reservations }
  }

  if (['canceled', 'failed', 'declined'].includes(payment.status)) {
    const flagged = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          needsRefund: true,
          lastEventName: eventName || payment.lastEventName,
          rawLastEvent: raw,
          errorMessage:
            payment.errorMessage ||
            `Paiement réservation orphelin (statut ${payment.status}) — remboursement requis`,
        },
        ...(eventId ? { $addToSet: { processedEventIds: String(eventId) } } : {}),
      },
      { new: true },
    )
    logger.warn('FedaPay approved ignoré — paiement réservation terminal', {
      paymentId: String(payment._id),
      status: payment.status,
    })
    const reservations = flagged.reservationGroupId
      ? await Reservation.find({ bookingGroupId: flagged.reservationGroupId })
      : []
    void broadcastReservationPaymentUpdate(flagged, reservations)
    return { payment: flagged, alreadyProcessed: true, needsRefund: true, orphan: true, reservations }
  }

  const update = {
    $set: {
      status: 'approved',
      lastEventName: eventName || payment.lastEventName,
      rawLastEvent: raw,
      activatedAt: new Date(),
    },
  }
  if (eventId) update.$addToSet = { processedEventIds: String(eventId) }

  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, update, {
    new: true,
  })

  if (!claimed) {
    const fresh = await Payment.findById(payment._id)
    if (fresh?.status === 'approved') {
      const reservations = fresh.reservationGroupId
        ? await Reservation.find({ bookingGroupId: fresh.reservationGroupId })
        : []
      return { payment: fresh, alreadyProcessed: true, reservations }
    }
    if (fresh && ['canceled', 'failed', 'declined'].includes(fresh.status)) {
      const flagged = await Payment.findByIdAndUpdate(
        fresh._id,
        {
          $set: {
            needsRefund: true,
            errorMessage:
              fresh.errorMessage ||
              `Paiement réservation orphelin (statut ${fresh.status}) — remboursement requis`,
          },
        },
        { new: true },
      )
      return { payment: flagged, alreadyProcessed: true, needsRefund: true, orphan: true, reservations: [] }
    }
    return { payment: fresh || payment, alreadyProcessed: true, reservations: [] }
  }

  if (!claimed.reservationGroupId) {
    claimed.needsRefund = true
    claimed.errorMessage =
      claimed.errorMessage || 'Paiement réservation approved sans groupe — remboursement requis'
    await claimed.save()
    const error = new Error('Réservation liée introuvable')
    error.status = 404
    throw error
  }

  const pending = await Reservation.find({
    bookingGroupId: claimed.reservationGroupId,
    status: 'pending_payment',
  })

  for (const reservation of pending) {
    reservation.status = 'confirmed'
    reservation.paymentStatus = 'paid'
    reservation.paymentRef = claimed.fedapayReference || claimed.fedapayTransactionId || ''
    await reservation.save()
  }

  const reservations = await Reservation.find({ bookingGroupId: claimed.reservationGroupId })
  void broadcastReservationPaymentUpdate(claimed, reservations)

  if (!reservations.length) {
    claimed.needsRefund = true
    claimed.errorMessage =
      claimed.errorMessage || 'Paiement approved sans réservation — remboursement requis'
    await claimed.save()
    const error = new Error('Réservation liée introuvable')
    error.status = 404
    throw error
  }

  // Approved mais plus aucune réservation pending (expirée / annulée) → orphelin.
  if (pending.length === 0) {
    claimed.needsRefund = true
    claimed.errorMessage =
      claimed.errorMessage ||
      'Paiement approved sans créneau livrable (annulé/expiré) — remboursement requis'
    await claimed.save()
    void broadcastReservationPaymentUpdate(claimed, reservations)
    logger.warn('Paiement réservation orphelin — needsRefund', { paymentId: String(claimed._id) })
  }

  return { payment: claimed, reservations, alreadyProcessed: false, unlocked: pending.length }
}

export async function applyFailedReservationPayment(
  payment,
  status,
  { eventName = '', eventId = '', raw = null, message = '' } = {},
) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true, reservations: [] }
  }

  if (payment.status === 'approved') {
    if (eventId) {
      await Payment.findByIdAndUpdate(payment._id, {
        $addToSet: { processedEventIds: String(eventId) },
      })
    }
    return { payment, alreadyProcessed: true, reservations: [] }
  }

  if (['canceled', 'failed', 'declined'].includes(payment.status) && payment.status !== status) {
    const update = {
      $set: {
        lastEventName: eventName || payment.lastEventName,
        rawLastEvent: raw,
      },
    }
    if (message && !payment.errorMessage) update.$set.errorMessage = message
    if (eventId) update.$addToSet = { processedEventIds: String(eventId) }
    const updated = await Payment.findByIdAndUpdate(payment._id, update, { new: true })
    return { payment: updated, alreadyProcessed: true, reservations: [] }
  }

  const update = {
    $set: {
      status,
      lastEventName: eventName || payment.lastEventName,
      errorMessage: message || payment.errorMessage,
      rawLastEvent: raw,
    },
  }
  if (eventId) update.$addToSet = { processedEventIds: String(eventId) }

  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ['pending', status] } },
    update,
    { new: true },
  )
  const effective = claimed || (await Payment.findById(payment._id))

  const pending = effective?.reservationGroupId
    ? await Reservation.find({
        bookingGroupId: effective.reservationGroupId,
        status: 'pending_payment',
      })
    : []

  for (const reservation of pending) {
    await releaseReservationSlot(reservation, {
      reason: message || 'Paiement échoué',
      cancelledBy: 'admin',
    })
  }

  const reservations = effective?.reservationGroupId
    ? await Reservation.find({ bookingGroupId: effective.reservationGroupId })
    : []
  if (claimed) void broadcastReservationPaymentUpdate(claimed, reservations)

  return { payment: effective, reservations, alreadyProcessed: !claimed }
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

  const syncEventId = `sync:${payment.fedapayTransactionId}`

  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      fedapayReference: payment.fedapayReference,
      ...(payment.paymentMethod ? { paymentMethod: payment.paymentMethod } : {}),
    },
  })

  if (mapped === 'approved') {
    await applyApprovedReservationPayment(payment, {
      eventName: 'transaction.synced',
      eventId: syncEventId,
      raw: remote,
    })
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
      eventId: syncEventId,
      message,
      raw: remote,
    })
  } else if (payment.status === 'pending') {
    await payment.save()
  }

  return Payment.findById(payment._id)
}
