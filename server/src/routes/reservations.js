import { Router } from 'express'
import mongoose from 'mongoose'
import { Moniteur } from '../models/Moniteur.js'
import { Creneau } from '../models/Creneau.js'
import { Reservation } from '../models/Reservation.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireSubscriptionAccess } from '../middleware/subscriptionAccess.js'
import {
  buildWhatsAppLink,
  formatReservationReminder,
  sendWhatsAppMessage,
} from '../services/whatsapp.js'
import {
  addLocalDays,
  formatLocalDate,
  normalizeVehicleType,
} from '../utils/localDate.js'

const router = Router()
const withConduiteAccess = [requireUserAuth, requireSubscriptionAccess('conduite')]
const LOCK_MS = 15 * 60 * 1000

function asObjectId(value) {
  if (!value) return null
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value)
  }
  return null
}

function slotDateTime(date, time) {
  return new Date(`${date}T${time}:00`)
}

function canCancel(creneau) {
  const start = slotDateTime(creneau.date, creneau.startTime)
  const diffMs = start.getTime() - Date.now()
  return diffMs >= 24 * 60 * 60 * 1000
}

function asId(value) {
  if (value == null) return null
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

async function hydrateReservation(reservation) {
  await reservation.populate([
    { path: 'moniteurId', select: 'firstName lastName phone vehicleBrand vehiclePhotoUrl' },
    { path: 'creneauId' },
  ])
  const moniteur = reservation.moniteurId
  const creneau = reservation.creneauId
  return reservation.toJSONSafe({
    moniteur: moniteur
      ? {
          id: asId(moniteur._id || moniteur),
          fullName: `${moniteur.firstName} ${moniteur.lastName}`.trim(),
          phone: moniteur.phone || '',
          vehicleBrand: moniteur.vehicleBrand || '',
          vehiclePhotoUrl: moniteur.vehiclePhotoUrl || '',
        }
      : null,
    creneau: creneau?.toJSONSafe?.() ?? null,
    canCancel: creneau ? canCancel(creneau) : false,
  })
}

router.get('/dashboard', ...withConduiteAccess, async (req, res) => {
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const upcoming = await Reservation.find({
      userId: req.user._id,
      status: { $in: ['pending_payment', 'confirmed'] },
    })
      .populate('creneauId')
      .populate('moniteurId', 'firstName lastName phone vehicleBrand vehiclePhotoUrl')
      .sort({ createdAt: -1 })

    const upcomingFiltered = []
    for (const item of upcoming) {
      if (!item.creneauId) continue
      const start = slotDateTime(item.creneauId.date, item.creneauId.startTime)
      if (start >= now || item.creneauId.date >= today) {
        upcomingFiltered.push(await hydrateReservation(item))
      }
    }

    upcomingFiltered.sort((a, b) => {
      const aKey = `${a.creneau?.date || ''}T${a.creneau?.startTime || ''}`
      const bKey = `${b.creneau?.date || ''}T${b.creneau?.startTime || ''}`
      return aKey.localeCompare(bKey)
    })

    const user = req.user
    const objectif = user.heuresObjectif || 20
    const effectuees = user.heuresEffectuees || 0

    res.json({
      success: true,
      data: {
        progress: {
          soldeHeures: user.soldeHeures || 0,
          heuresEffectuees: effectuees,
          heuresObjectif: objectif,
          percent: Math.min(100, Math.round((effectuees / objectif) * 100)),
          label: `Progression : ${effectuees} / ${objectif} h`,
        },
        upcoming: upcomingFiltered.slice(0, 10),
      },
    })
  } catch (error) {
    console.error('Erreur dashboard conduite:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/moniteurs', ...withConduiteAccess, async (req, res) => {
  try {
    const rawType = normalizeVehicleType(req.query.vehicleType, '')
    const filter = { active: true }
    if (rawType.length >= 2) {
      filter.vehicleTypes = rawType
    }
    const moniteurs = await Moniteur.find(filter).sort({ lastName: 1, firstName: 1 })
    res.json({
      success: true,
      data: { moniteurs: moniteurs.map((item) => item.toJSONSafe()) },
    })
  } catch (error) {
    console.error('Erreur moniteurs publics:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/creneaux', ...withConduiteAccess, async (req, res) => {
  try {
    const from = String(req.query.from || formatLocalDate()).slice(0, 20)
    const to = addLocalDays(from, Number(req.query.days) || 14) || from
    const vehicleType = normalizeVehicleType(req.query.vehicleType, '')
    const moniteurId = req.query.moniteurId ? String(req.query.moniteurId).slice(0, 30) : null

    const filter = {
      date: { $gte: from, $lte: to },
    }
    if (vehicleType.length >= 2) filter.vehicleType = vehicleType
    if (moniteurId) {
      const oid = asObjectId(moniteurId)
      if (oid) filter.moniteurId = oid
    }

    // Libère les verrous expirés
    await Creneau.updateMany(
      {
        status: 'libre',
        lockedUntil: { $lt: new Date() },
      },
      { $set: { lockedUntil: null, lockedBy: null } },
    )

    const creneaux = await Creneau.find(filter)
      .populate('moniteurId', 'firstName lastName vehicleBrand vehiclePhotoUrl vehicleTypes')
      .sort({ date: 1, startTime: 1 })

    const byDate = {}
    for (const slot of creneaux) {
      const locked =
        slot.lockedUntil &&
        slot.lockedUntil > new Date() &&
        String(slot.lockedBy) !== String(req.user._id)
      const available = slot.status === 'libre' && !locked
      const item = {
        ...slot.toJSONSafe(),
        available,
        moniteur: slot.moniteurId
          ? {
              id: asId(slot.moniteurId._id || slot.moniteurId),
              fullName: `${slot.moniteurId.firstName} ${slot.moniteurId.lastName}`.trim(),
              vehicleBrand: slot.moniteurId.vehicleBrand || '',
              vehiclePhotoUrl: slot.moniteurId.vehiclePhotoUrl || '',
            }
          : null,
      }
      if (!byDate[slot.date]) byDate[slot.date] = []
      byDate[slot.date].push(item)
    }

    res.json({
      success: true,
      data: {
        from,
        to,
        days: Object.keys(byDate)
          .sort()
          .map((date) => ({ date, creneaux: byDate[date] })),
      },
    })
  } catch (error) {
    console.error('Erreur créneaux publics:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Verrouille un créneau (anti double-réservation) pendant le checkout. */
router.post('/creneaux/:id/lock', ...withConduiteAccess, async (req, res) => {
  try {
    const now = new Date()
    const lockedUntil = new Date(now.getTime() + LOCK_MS)

    const creneau = await Creneau.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'libre',
        $or: [
          { lockedUntil: null },
          { lockedUntil: { $lt: now } },
          { lockedBy: req.user._id },
        ],
      },
      {
        $set: {
          lockedUntil,
          lockedBy: req.user._id,
        },
      },
      { new: true },
    )

    if (!creneau) {
      return res.status(409).json({
        success: false,
        error: 'Ce créneau vient d’être réservé par un autre élève',
      })
    }

    res.json({
      success: true,
      data: { creneau: creneau.toJSONSafe(), lockedUntil },
    })
  } catch (error) {
    console.error('Erreur verrouillage créneau:', error)
    res.status(500).json({ success: false, error: 'Verrouillage impossible' })
  }
})

router.post('/reservations', ...withConduiteAccess, async (req, res) => {
  try {
    const creneauId = asId(req.body.creneauId)
    const vehicleType = normalizeVehicleType(req.body.vehicleType)
    const moniteurId = req.body.moniteurId ? asId(req.body.moniteurId) : null
    const paymentRef = String(req.body.paymentRef || '').trim()

    if (!creneauId) {
      return res.status(400).json({ success: false, error: 'Créneau requis' })
    }

    const now = new Date()
    const creneau = await Creneau.findOneAndUpdate(
      {
        _id: creneauId,
        status: 'libre',
        $or: [
          { lockedBy: req.user._id },
          { lockedUntil: null },
          { lockedUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          status: 'reserve',
          lockedUntil: null,
          lockedBy: null,
        },
      },
      { new: true },
    )

    if (!creneau) {
      return res.status(409).json({
        success: false,
        error: 'Créneau indisponible (déjà réservé ou verrou expiré). Revenez au calendrier.',
      })
    }

    const assignedMoniteurId = moniteurId || asId(creneau.moniteurId)

    let reservation
    try {
      reservation = await Reservation.create({
        userId: req.user._id,
        moniteurId: assignedMoniteurId,
        creneauId: creneau._id,
        vehicleType: creneau.vehicleType || vehicleType,
        status: 'pending_payment',
        paymentStatus: paymentRef ? 'pending_validation' : 'unpaid',
        paymentRef,
        priceFcfa: creneau.priceFcfa || 5000,
      })
    } catch (error) {
      // rollback créneau uniquement si la réservation n’a pas été créée
      await Creneau.findByIdAndUpdate(creneau._id, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, error: 'Créneau déjà réservé' })
      }
      throw error
    }

    let hydrated
    try {
      hydrated = await hydrateReservation(reservation)
    } catch (hydrateError) {
      console.error('Hydratation réservation:', hydrateError)
      hydrated = reservation.toJSONSafe({
        moniteur: null,
        creneau: creneau.toJSONSafe(),
        canCancel: canCancel(creneau),
      })
    }

    const moniteur = await Moniteur.findById(assignedMoniteurId)
    const waText = formatReservationReminder({
      firstName: req.user.firstName,
      date: creneau.date,
      startTime: creneau.startTime,
      moniteurName: moniteur
        ? `${moniteur.firstName} ${moniteur.lastName}`.trim()
        : '',
    })

    res.status(201).json({
      success: true,
      data: {
        reservation: hydrated,
        whatsappLink: buildWhatsAppLink(req.user.phone, waText),
        calendarHint: {
          title: 'Séance de conduite — Monpermis.bj',
          date: creneau.date,
          startTime: creneau.startTime,
          endTime: creneau.endTime,
        },
      },
    })
  } catch (error) {
    console.error('Erreur création réservation:', error)
    res.status(500).json({ success: false, error: 'Réservation impossible' })
  }
})

router.post('/reservations/:id/payment-ref', ...withConduiteAccess, async (req, res) => {
  try {
    const paymentRef = String(req.body.paymentRef || '').trim()
    if (paymentRef.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Référence Mobile Money invalide',
      })
    }

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Réservation annulée' })
    }

    reservation.paymentRef = paymentRef
    reservation.paymentStatus = 'pending_validation'
    await reservation.save()

    res.json({
      success: true,
      data: { reservation: await hydrateReservation(reservation) },
    })
  } catch (error) {
    console.error('Erreur paiement ref:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

router.post('/reservations/:id/cancel', ...withConduiteAccess, async (req, res) => {
  try {
    const reason = String(req.body.reason || req.body.cancellationReason || '').trim()
    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Indiquez une justification d’au moins 5 caractères',
      })
    }
    if (reason.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Justification trop longue (500 caractères max)',
      })
    }

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('creneauId')

    if (!reservation || !reservation.creneauId) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Déjà annulée' })
    }
    if (reservation.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Séance déjà effectuée' })
    }
    if (!canCancel(reservation.creneauId)) {
      return res.status(400).json({
        success: false,
        error: 'Annulation possible uniquement jusqu’à 24 h avant la séance',
      })
    }

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason
    reservation.cancelledBy = 'learner'
    await reservation.save()

    await Creneau.findByIdAndUpdate(reservation.creneauId._id, {
      status: 'libre',
      lockedUntil: null,
      lockedBy: null,
    })

    res.json({
      success: true,
      data: { reservation: await hydrateReservation(reservation) },
    })
  } catch (error) {
    console.error('Erreur annulation:', error)
    res.status(500).json({ success: false, error: 'Annulation impossible' })
  }
})

/** Job manuel / cron : rappels WhatsApp 2 h avant. */
router.post('/reminders/run', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key']
    if (apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({ success: false, error: 'Non autoris\u00e9' })
    }
    const now = Date.now()
    const inTwoHours = now + 2 * 60 * 60 * 1000
    const windowStart = now + 1.5 * 60 * 60 * 1000
    const windowEnd = inTwoHours + 30 * 60 * 1000

    const reservations = await Reservation.find({
      status: 'confirmed',
      reminderSentAt: null,
    })
      .populate('creneauId')
      .populate('userId', 'firstName phone')
      .populate('moniteurId', 'firstName lastName')

    let sent = 0
    for (const reservation of reservations) {
      if (!reservation.creneauId || !reservation.userId) continue
      const start = slotDateTime(
        reservation.creneauId.date,
        reservation.creneauId.startTime,
      ).getTime()
      if (start < windowStart || start > windowEnd) continue

      const moniteurName = reservation.moniteurId
        ? `${reservation.moniteurId.firstName} ${reservation.moniteurId.lastName}`.trim()
        : ''
      const body = formatReservationReminder({
        firstName: reservation.userId.firstName,
        date: reservation.creneauId.date,
        startTime: reservation.creneauId.startTime,
        moniteurName,
      })
      await sendWhatsAppMessage({ to: reservation.userId.phone, body })
      reservation.reminderSentAt = new Date()
      await reservation.save()
      sent += 1
    }

    res.json({ success: true, data: { sent } })
  } catch (error) {
    console.error('Erreur rappels:', error)
    res.status(500).json({ success: false, error: 'Rappels impossibles' })
  }
})

export default router
