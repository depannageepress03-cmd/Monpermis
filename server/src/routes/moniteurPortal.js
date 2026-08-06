import { Router } from 'express'
import mongoose from 'mongoose'
import { Creneau } from '../models/Creneau.js'
import { Payment } from '../models/Payment.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { requireMoniteurAuth } from '../middleware/moniteurAuth.js'
import { notifyUser } from '../services/notifications.js'
import { logger } from '../utils/logger.js'
import {
  isValidHhMm,
  normalizeTime,
  timeToMinutes,
} from '../utils/availability.js'
import { computeCreneauHeures } from '../utils/creneauDuration.js'
import { normalizeVehicleType } from '../utils/localDate.js'

const router = Router()
router.use(requireMoniteurAuth)

const ACTIVE_RESERVATION_STATUSES = ['pending_payment', 'pending_moniteur', 'confirmed']

function asObjectId(value) {
  if (!value) return null
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value)
  }
  return null
}

function hydrateReservation(item) {
  const user = item.userId
  const creneau = item.creneauId
  return item.toJSONSafe({
    user: user
      ? {
          id: String(user._id || user),
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || '',
          email: user.email || '',
        }
      : null,
    creneau: creneau?.toJSONSafe?.() ?? null,
  })
}

async function flagMobileMoneyRefundIfNeeded(reservation) {
  if (reservation.heuresDebitees > 0) return
  if (reservation.paymentStatus !== 'paid') return
  if (!reservation.bookingGroupId) return
  if (String(reservation.paymentRef || '') === 'solde_heures') return

  const payment = await Payment.findOne({
    reservationGroupId: reservation.bookingGroupId,
    method: 'fedapay',
  }).sort({ createdAt: -1 })

  if (!payment) return
  if (payment.needsRefund) return

  payment.needsRefund = true
  payment.errorMessage =
    payment.errorMessage ||
    'Réservation refusée par le moniteur après paiement — remboursement Mobile Money requis'
  await payment.save()
  logger.warn('Remboursement MM à traiter après refus moniteur', {
    paymentId: String(payment._id),
    reservationId: String(reservation._id),
  })
}

/** Liste des créneaux du moniteur (futurs + récents). */
router.get('/creneaux', async (req, res) => {
  try {
    const from = String(req.query.from || '').slice(0, 10)
    const filter = { moniteurId: req.moniteur._id }
    if (from) filter.date = { $gte: from }

    const creneaux = await Creneau.find(filter).sort({ date: 1, startTime: 1 }).limit(500)

    const ids = creneaux.map((item) => item._id)
    const activeHolds = await Reservation.find({
      creneauId: { $in: ids },
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    }).select('creneauId status')

    const holdByCreneau = new Map(
      activeHolds.map((item) => [String(item.creneauId), item.status]),
    )

    res.json({
      success: true,
      data: {
        creneaux: creneaux.map((item) => ({
          ...item.toJSONSafe(),
          reservationStatus: holdByCreneau.get(String(item._id)) || null,
          editable: !holdByCreneau.has(String(item._id)) && item.status === 'libre',
        })),
      },
    })
  } catch (error) {
    logger.error('Erreur liste créneaux moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/creneaux', async (req, res) => {
  try {
    const date = String(req.body.date || '').trim().slice(0, 10)
    const startTime = normalizeTime(req.body.startTime)
    const endTime = normalizeTime(req.body.endTime)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidHhMm(startTime) || !isValidHhMm(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Date, heure de début et heure de fin requises',
      })
    }
    if (!(timeToMinutes(endTime) > timeToMinutes(startTime))) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après le début' })
    }

    const heures = computeCreneauHeures({ startTime, endTime })
    if (heures < 0.5) {
      return res.status(400).json({ success: false, error: 'Durée minimale : 30 minutes' })
    }
    if (heures > 6) {
      return res.status(400).json({ success: false, error: 'Durée maximale : 6 heures' })
    }

    const vehicleType = normalizeVehicleType(
      req.body.vehicleType ||
        (Array.isArray(req.moniteur.vehicleTypes) && req.moniteur.vehicleTypes[0]) ||
        'voiture',
    )
    const hourly = req.moniteur.defaultPriceFcfa || 5000

    let creneau
    try {
      creneau = await Creneau.create({
        moniteurId: req.moniteur._id,
        date,
        startTime,
        endTime,
        vehicleType,
        status: 'libre',
        priceFcfa: Math.round(hourly * heures),
        lockedUntil: null,
        lockedBy: null,
      })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Un créneau commence déjà à cette heure ce jour-là',
        })
      }
      throw error
    }

    res.status(201).json({
      success: true,
      data: { creneau: { ...creneau.toJSONSafe(), editable: true, reservationStatus: null } },
    })
  } catch (error) {
    logger.error('Erreur création créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/creneaux/:id', async (req, res) => {
  try {
    const creneau = await Creneau.findOne({ _id: req.params.id, moniteurId: req.moniteur._id })
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const active = await Reservation.exists({
      creneauId: creneau._id,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    })
    if (active || creneau.status !== 'libre') {
      return res.status(400).json({
        success: false,
        error: 'Ce créneau est réservé et ne peut plus être modifié',
      })
    }

    const date =
      req.body.date !== undefined ? String(req.body.date || '').trim().slice(0, 10) : creneau.date
    const startTime =
      req.body.startTime !== undefined ? normalizeTime(req.body.startTime) : creneau.startTime
    const endTime =
      req.body.endTime !== undefined ? normalizeTime(req.body.endTime) : creneau.endTime

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidHhMm(startTime) || !isValidHhMm(endTime)) {
      return res.status(400).json({ success: false, error: 'Horaires invalides' })
    }
    if (!(timeToMinutes(endTime) > timeToMinutes(startTime))) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après le début' })
    }

    const heures = computeCreneauHeures({ startTime, endTime })
    if (heures < 0.5 || heures > 6) {
      return res.status(400).json({ success: false, error: 'Durée entre 30 minutes et 6 heures' })
    }

    creneau.date = date
    creneau.startTime = startTime
    creneau.endTime = endTime
    creneau.priceFcfa = Math.round((req.moniteur.defaultPriceFcfa || 5000) * heures)
    if (req.body.vehicleType !== undefined) {
      creneau.vehicleType = normalizeVehicleType(req.body.vehicleType)
    }

    try {
      await creneau.save()
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Un créneau commence déjà à cette heure ce jour-là',
        })
      }
      throw error
    }

    res.json({
      success: true,
      data: { creneau: { ...creneau.toJSONSafe(), editable: true, reservationStatus: null } },
    })
  } catch (error) {
    logger.error('Erreur maj créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/creneaux/:id', async (req, res) => {
  try {
    const creneau = await Creneau.findOne({ _id: req.params.id, moniteurId: req.moniteur._id })
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const active = await Reservation.exists({
      creneauId: creneau._id,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    })
    if (active || creneau.status !== 'libre') {
      return res.status(400).json({
        success: false,
        error: 'Ce créneau est réservé et ne peut plus être supprimé',
      })
    }

    await creneau.deleteOne()
    res.json({ success: true, data: { deleted: true, id: String(req.params.id) } })
  } catch (error) {
    logger.error('Erreur suppression créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Demandes payées en attente de validation moniteur. */
router.get('/reservations/pending', async (req, res) => {
  try {
    const reservations = await Reservation.find({
      moniteurId: req.moniteur._id,
      status: 'pending_moniteur',
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({
      success: true,
      data: { reservations: reservations.map(hydrateReservation) },
    })
  } catch (error) {
    logger.error('Erreur RDV moniteur pending:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/reservations/:id/confirm', async (req, res) => {
  try {
    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: req.params.id,
        moniteurId: req.moniteur._id,
        status: 'pending_moniteur',
      },
      { $set: { status: 'confirmed' } },
      { new: true },
    )
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable ou déjà traitée',
      })
    }

    if (reservation.creneauId?._id || reservation.creneauId) {
      await Creneau.findByIdAndUpdate(reservation.creneauId._id || reservation.creneauId, {
        status: 'reserve',
        lockedUntil: null,
        lockedBy: null,
      })
    }

    if (reservation.userId) {
      await notifyUser(reservation.userId._id || reservation.userId, {
        type: 'reservation_confirmed',
        title: 'Leçon confirmée',
        body: 'Ton moniteur a confirmé ta séance de conduite.',
        link: 'conduite/reservations',
      })
    }

    res.json({ success: true, data: { reservation: hydrateReservation(reservation) } })
  } catch (error) {
    logger.error('Erreur confirm moniteur:', error)
    res.status(500).json({ success: false, error: 'Confirmation impossible' })
  }
})

router.post('/reservations/:id/refuse', async (req, res) => {
  try {
    const reason = String(req.body.reason || req.body.cancellationReason || '').trim()
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      moniteurId: req.moniteur._id,
      status: 'pending_moniteur',
    }).populate('creneauId')

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable ou déjà traitée',
      })
    }

    const shouldRefundHours = reservation.heuresDebitees > 0

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason || 'Refusée par le moniteur'
    reservation.cancelledBy = 'moniteur'
    await reservation.save()

    if (shouldRefundHours) {
      await User.findByIdAndUpdate(reservation.userId, {
        $inc: { soldeHeures: reservation.heuresDebitees },
      })
    } else {
      await flagMobileMoneyRefundIfNeeded(reservation)
    }

    if (reservation.creneauId?._id || reservation.creneauId) {
      await Creneau.findByIdAndUpdate(reservation.creneauId._id || reservation.creneauId, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
    }

    if (reservation.userId) {
      await notifyUser(reservation.userId, {
        type: 'reservation_cancelled',
        title: 'Réservation refusée',
        body:
          reservation.cancellationReason ||
          'Le moniteur a refusé ta demande. Les heures / le paiement seront remboursés.',
        link: 'conduite/reservations',
      })
    }

    const hydrated = await Reservation.findById(reservation._id)
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({ success: true, data: { reservation: hydrateReservation(hydrated) } })
  } catch (error) {
    logger.error('Erreur refus moniteur:', error)
    res.status(500).json({ success: false, error: 'Refus impossible' })
  }
})

/** Historique (confirmées, refusées, effectuées). */
router.get('/reservations/history', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = {
      moniteurId: req.moniteur._id,
      status: { $in: ['confirmed', 'cancelled', 'completed'] },
    }
    if (status && ['confirmed', 'cancelled', 'completed'].includes(status)) {
      filter.status = status
    }

    const reservations = await Reservation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(300)
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({
      success: true,
      data: { reservations: reservations.map(hydrateReservation) },
    })
  } catch (error) {
    logger.error('Erreur historique moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
