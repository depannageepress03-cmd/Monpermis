import { Router } from 'express'
import { Payment } from '../models/Payment.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { Moniteur } from '../models/Moniteur.js'
import { AccessModulePricing } from '../models/AccessModulePricing.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()

const MODULE_FALLBACK_LABELS = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  ecodepermis: 'E-Codepermis (retiré)',
  aiChat: 'Chat IA tuteur',
}

function formatSlotLabel(creneau) {
  if (!creneau) return 'Séance de conduite'
  return `Séance du ${creneau.date} · ${creneau.startTime} – ${creneau.endTime}`
}

/**
 * Historique unifié : abonnements (AccessRequest) et réservations payées à la séance
 * partagent la collection Payment via accessRequestIds / reservationGroupId.
 */
router.get('/me', requireUserAuth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)

    const accessRequestIds = []
    const reservationGroupIds = []
    for (const payment of payments) {
      for (const id of payment.linkedRequestIds()) accessRequestIds.push(id)
      if (payment.reservationGroupId) reservationGroupIds.push(payment.reservationGroupId)
    }

    const [requests, reservations, pricings] = await Promise.all([
      accessRequestIds.length
        ? AccessRequest.find({ _id: { $in: accessRequestIds } }).select(
            'module quantity unit amount currency status startAt endAt',
          )
        : [],
      reservationGroupIds.length
        ? Reservation.find({ bookingGroupId: { $in: reservationGroupIds } }).select(
            'bookingGroupId creneauId moniteurId status paymentStatus priceFcfa',
          )
        : [],
      AccessModulePricing.find().select('key label'),
    ])

    const labelByModule = { ...MODULE_FALLBACK_LABELS }
    for (const pricing of pricings) labelByModule[pricing.key] = pricing.label

    const requestById = new Map(requests.map((item) => [String(item._id), item]))

    const creneauIds = reservations.map((item) => item.creneauId).filter(Boolean)
    const moniteurIds = reservations.map((item) => item.moniteurId).filter(Boolean)
    const [creneaux, moniteurs] = await Promise.all([
      creneauIds.length
        ? Creneau.find({ _id: { $in: creneauIds } }).select('date startTime endTime')
        : [],
      moniteurIds.length
        ? Moniteur.find({ _id: { $in: moniteurIds } }).select('firstName lastName')
        : [],
    ])
    const creneauById = new Map(creneaux.map((item) => [String(item._id), item]))
    const moniteurById = new Map(moniteurs.map((item) => [String(item._id), item]))

    const reservationsByGroup = new Map()
    for (const reservation of reservations) {
      const key = String(reservation.bookingGroupId)
      if (!reservationsByGroup.has(key)) reservationsByGroup.set(key, [])
      reservationsByGroup.get(key).push(reservation)
    }

    const items = payments.map((payment) => {
      const base = payment.toPublicJSON()
      const linked = payment.linkedRequestIds().map((id) => requestById.get(String(id))).filter(Boolean)

      if (linked.length > 0) {
        return {
          ...base,
          kind: 'abonnement',
          title: linked
            .map((item) => {
              const label = labelByModule[item.module] || item.module
              return item.module === 'conduite_heures' && item.quantity > 1
                ? `${label} × ${item.quantity} h`
                : label
            })
            .join(' + '),
          modules: linked.map((item) => item.module),
          lines: linked.map((item) => ({
            module: item.module,
            label: labelByModule[item.module] || item.module,
            quantity: item.quantity,
            unit: item.unit,
            amount: item.amount,
            status: item.status,
            startAt: item.startAt,
            endAt: item.endAt,
          })),
        }
      }

      const group = reservationsByGroup.get(String(payment.reservationGroupId)) || []
      if (group.length > 0) {
        const first = group[0]
        const creneau = creneauById.get(String(first.creneauId))
        const moniteur = moniteurById.get(String(first.moniteurId))
        return {
          ...base,
          kind: 'reservation',
          title: formatSlotLabel(creneau),
          modules: [],
          lines: group.map((item) => {
            const slot = creneauById.get(String(item.creneauId))
            return {
              module: 'conduite_heures',
              label: formatSlotLabel(slot),
              quantity: 1,
              unit: 'hour',
              amount: item.priceFcfa || 0,
              status: item.status,
            }
          }),
          moniteurName: moniteur ? `${moniteur.firstName} ${moniteur.lastName}`.trim() : '',
        }
      }

      return { ...base, kind: 'autre', title: 'Paiement', modules: [], lines: [] }
    })

    res.json({ success: true, data: { payments: items } })
  } catch (error) {
    logger.error('Erreur historique paiements', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
