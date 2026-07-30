import { Router } from 'express'
import mongoose from 'mongoose'
import { Moniteur } from '../models/Moniteur.js'
import { Creneau } from '../models/Creneau.js'
import { Reservation } from '../models/Reservation.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import {
  ADMIN_WHATSAPP_NUMBER,
  buildWhatsAppLink,
  formatReservationNotifyAdmin,
} from '../services/whatsapp.js'
import { runReservationReminders } from '../utils/reservationReminders.js'
import {
  addLocalDays,
  formatLocalDate,
  normalizeVehicleType,
} from '../utils/localDate.js'
import { computeCreneauHeures } from '../utils/creneauDuration.js'
import {
  applyHoursDiscount,
  HOURS_DISCOUNT_FCFA,
  HOURS_DISCOUNT_MIN_HOURS,
} from '../utils/pricing.js'
import {
  BOOKING_LEAD_MINUTES,
  intervalsOverlap,
  isValidHhMm,
  isWithinWindows,
  normalizeTime,
  subtractBusy,
  windowsForDate,
} from '../utils/availability.js'
import {
  configureFedaPay,
  sendFedaPayMobileMoney,
  FEDAPAY_MOBILE_OPERATORS,
  guessBeninMobileOperator,
  normalizeBeninPhone,
  normalizeOperatorId,
  operatorLabel,
} from '../services/fedapay.js'
import {
  buildReservationCallbackUrl,
  cancelPendingReservationPayment,
  applyApprovedReservationPayment,
  syncReservationPaymentFromProvider,
} from '../utils/reservationPayments.js'
import { recordPaymentCreated } from '../utils/paymentLedger.js'
import { logger } from '../utils/logger.js'

const router = Router()
/** Réservations : auth seule — le solde d’heures est contrôlé à la création. */
const withConduiteAccess = [requireUserAuth]
const LOCK_MS = 15 * 60 * 1000

/** Créneaux qui bloquent une plage pour les autres élèves (réservés, bloqués, ou verrou pending). */
function busySlotFilter(viewerUserId, now = new Date()) {
  return {
    $or: [
      { status: { $in: ['reserve', 'bloque'] } },
      {
        status: 'libre',
        lockedUntil: { $gt: now },
        lockedBy: { $ne: viewerUserId },
      },
    ],
  }
}

async function findOverlappingBusyCreneau({
  moniteurId,
  date,
  startTime,
  endTime,
  viewerUserId,
  excludeIds = [],
}) {
  const candidates = await Creneau.find({
    moniteurId,
    date,
    ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
    ...busySlotFilter(viewerUserId),
  }).select('startTime endTime status lockedBy lockedUntil')

  return (
    candidates.find((slot) => intervalsOverlap(startTime, endTime, slot.startTime, slot.endTime)) ||
    null
  )
}

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

/**
 * Montant réellement dû pour un ensemble de créneaux réservés ensemble.
 * Les priceFcfa des créneaux sont des prix de ligne sans remise : la remise
 * heures de conduite n'est retirée qu'une fois, sur le total de la réservation.
 */
function computeBookingAmount(creneaux) {
  const base = creneaux.reduce((sum, creneau) => sum + (creneau.priceFcfa || 5000), 0)
  const heures = creneaux.reduce((sum, creneau) => sum + computeCreneauHeures(creneau), 0)
  return applyHoursDiscount(base, heures)
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
    { path: 'moniteurId', select: 'firstName lastName phone vehicleBrand vehiclePhotoUrl photoUrl' },
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
          photoUrl: moniteur.photoUrl || '',
        }
      : null,
    creneau: creneau?.toJSONSafe?.() ?? null,
    canCancel: creneau ? canCancel(creneau) : false,
  })
}

async function hydrateReservationGroup(reservations) {
  return Promise.all(reservations.map((reservation) => hydrateReservation(reservation)))
}

router.get('/mine', ...withConduiteAccess, async (req, res) => {
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const rows = await Reservation.find({
      userId: req.user._id,
      status: { $in: ['pending_payment', 'confirmed'] },
    })
      .populate('creneauId')
      .populate('moniteurId', 'firstName lastName phone vehicleBrand vehiclePhotoUrl photoUrl')
      .sort({ createdAt: -1 })

    const list = []
    for (const item of rows) {
      if (!item.creneauId) continue
      const start = slotDateTime(item.creneauId.date, item.creneauId.startTime)
      if (start >= now || item.creneauId.date >= today) {
        list.push(await hydrateReservation(item))
      }
    }

    list.sort((a, b) => {
      const aKey = `${a.creneau?.date || ''}T${a.creneau?.startTime || ''}`
      const bKey = `${b.creneau?.date || ''}T${b.creneau?.startTime || ''}`
      return aKey.localeCompare(bKey)
    })

    res.json({ success: true, data: { reservations: list } })
  } catch (error) {
    console.error('Erreur liste réservations:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/dashboard', ...withConduiteAccess, async (req, res) => {
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const upcoming = await Reservation.find({
      userId: req.user._id,
      status: { $in: ['pending_payment', 'confirmed'] },
    })
      .populate('creneauId')
      .populate('moniteurId', 'firstName lastName phone vehicleBrand vehiclePhotoUrl photoUrl')
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

router.get('/moniteurs/:id', ...withConduiteAccess, async (req, res) => {
  try {
    const moniteur = await Moniteur.findOne({ _id: req.params.id, active: true })
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }
    res.json({ success: true, data: { moniteur: moniteur.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur profil moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/**
 * Disponibilité réelle du moniteur : plages hebdomadaires moins les séances déjà prises.
 * L’élève choisit ensuite une date et une plage « de … à … » dans ces fenêtres.
 */
router.get('/availability', ...withConduiteAccess, async (req, res) => {
  try {
    const moniteurId = asObjectId(req.query.moniteurId)
    if (!moniteurId) {
      return res.status(400).json({ success: false, error: 'Moniteur requis' })
    }
    const moniteur = await Moniteur.findOne({ _id: moniteurId, active: true })
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }

    const from = String(req.query.from || formatLocalDate()).slice(0, 10)
    const daysCount = Math.min(60, Math.max(1, Number(req.query.days) || 14))
    const to = addLocalDays(from, daysCount - 1) || from

    await Creneau.updateMany(
      { status: 'libre', lockedUntil: { $lt: new Date() } },
      { $set: { lockedUntil: null, lockedBy: null } },
    )

    const busyCreneaux = await Creneau.find({
      moniteurId,
      date: { $gte: from, $lte: to },
      ...busySlotFilter(req.user._id),
    }).select('date startTime endTime status')

    const busyByDate = {}
    for (const slot of busyCreneaux) {
      if (!busyByDate[slot.date]) busyByDate[slot.date] = []
      busyByDate[slot.date].push(slot)
    }

    const days = []
    let cursor = from
    for (let i = 0; i < daysCount; i += 1) {
      const windows = windowsForDate(moniteur.weeklyAvailability, cursor)
      const freeWindows = subtractBusy(windows, busyByDate[cursor] || [])
      if (freeWindows.length > 0) {
        days.push({ date: cursor, windows: freeWindows })
      }
      cursor = addLocalDays(cursor, 1) || cursor
      if (cursor > to) break
    }

    res.json({
      success: true,
      data: {
        moniteur: moniteur.toJSONSafe(),
        from,
        to,
        hourlyPriceFcfa: moniteur.defaultPriceFcfa || 5000,
        hoursDiscountFcfa: HOURS_DISCOUNT_FCFA,
        hoursDiscountMinHours: HOURS_DISCOUNT_MIN_HOURS,
        days,
      },
    })
  } catch (error) {
    console.error('Erreur disponibilité moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/**
 * L’élève demande une plage horaire précise. Crée un créneau à la volée et le verrouille.
 */
router.post('/request-slot', ...withConduiteAccess, async (req, res) => {
  try {
    const moniteurId = asObjectId(req.body.moniteurId)
    const date = String(req.body.date || '').trim().slice(0, 10)
    const startTime = normalizeTime(req.body.startTime)
    const endTime = normalizeTime(req.body.endTime)

    if (!moniteurId || !date || !isValidHhMm(startTime) || !isValidHhMm(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Moniteur, date, heure de début et heure de fin requis',
      })
    }

    const moniteur = await Moniteur.findOne({ _id: moniteurId, active: true })
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }

    // Contrôlé avant les fenêtres : un horaire trop proche est tronqué par
    // windowsForDate, ce qui produirait un message d'indisponibilité trompeur.
    const startAt = slotDateTime(date, startTime)
    if (startAt.getTime() <= Date.now() + BOOKING_LEAD_MINUTES * 60 * 1000) {
      return res.status(400).json({
        success: false,
        error: `Réservez au moins ${BOOKING_LEAD_MINUTES} minutes à l’avance. Choisissez un horaire plus tard.`,
        code: 'SLOT_TOO_SOON',
      })
    }

    const windows = windowsForDate(moniteur.weeklyAvailability, date)
    if (!windows.length) {
      return res.status(400).json({
        success: false,
        error: 'Ce moniteur n’est pas disponible ce jour-là',
      })
    }
    if (!isWithinWindows(windows, startTime, endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Horaires hors de la disponibilité du moniteur ce jour-là',
      })
    }

    const heures = computeCreneauHeures({ startTime, endTime })
    if (heures < 0.5) {
      return res.status(400).json({ success: false, error: 'Durée minimale : 30 minutes' })
    }
    if (heures > 6) {
      return res.status(400).json({ success: false, error: 'Durée maximale : 6 heures' })
    }

    await Creneau.updateMany(
      { status: 'libre', lockedUntil: { $lt: new Date() } },
      { $set: { lockedUntil: null, lockedBy: null } },
    )

    const conflicting = await Creneau.find({
      moniteurId,
      date,
      ...busySlotFilter(req.user._id),
    }).select('startTime endTime status lockedBy lockedUntil')

    const overlap = conflicting.find((slot) =>
      intervalsOverlap(startTime, endTime, slot.startTime, slot.endTime),
    )
    if (overlap) {
      return res.status(409).json({
        success: false,
        error: 'Cette plage chevauche une séance déjà réservée. Choisissez d’autres horaires.',
      })
    }

    // Libère un éventuel créneau encore verrouillé par cet élève (même moniteur/date)
    await Creneau.deleteMany({
      moniteurId,
      date,
      status: 'libre',
      lockedBy: req.user._id,
    })

    const vehicleType = normalizeVehicleType(
      req.body.vehicleType ||
        (Array.isArray(moniteur.vehicleTypes) && moniteur.vehicleTypes[0]) ||
        'voiture',
    )
    const hourly = moniteur.defaultPriceFcfa || 5000
    // priceFcfa reste le prix de ligne sans remise : la remise heures s'applique
    // une seule fois par réservation (voir computeBookingAmount).
    const priceFcfa = Math.round(hourly * heures)
    const lockedUntil = new Date(Date.now() + LOCK_MS)

    let creneau
    try {
      creneau = await Creneau.create({
        moniteurId: moniteur._id,
        date,
        startTime,
        endTime,
        vehicleType,
        status: 'libre',
        priceFcfa,
        lockedUntil,
        lockedBy: req.user._id,
      })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Cette plage vient d’être prise. Choisissez d’autres horaires.',
        })
      }
      throw error
    }

    // TOCTOU : un autre élève a pu créer une plage chevauchante entre le check et l’insert.
    const raced = await findOverlappingBusyCreneau({
      moniteurId,
      date,
      startTime,
      endTime,
      viewerUserId: req.user._id,
      excludeIds: [creneau._id],
    })
    if (raced) {
      await Creneau.findByIdAndDelete(creneau._id)
      return res.status(409).json({
        success: false,
        error: 'Cette plage vient d’être prise. Choisissez d’autres horaires.',
      })
    }

    const amountFcfa = computeBookingAmount([creneau])

    res.status(201).json({
      success: true,
      data: {
        creneau: {
          ...creneau.toJSONSafe(),
          available: true,
          moniteur: {
            id: String(moniteur._id),
            fullName: `${moniteur.firstName} ${moniteur.lastName}`.trim(),
            vehicleBrand: moniteur.vehicleBrand || '',
            vehiclePhotoUrl: moniteur.vehiclePhotoUrl || '',
            photoUrl: moniteur.photoUrl || '',
          },
        },
        hours: heures,
        amountFcfa,
        hoursDiscountFcfa: Math.max(0, priceFcfa - amountFcfa),
        lockedUntil,
      },
    })
  } catch (error) {
    console.error('Erreur demande de plage:', error)
    res.status(500).json({ success: false, error: 'Demande impossible' })
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
      .populate('moniteurId', 'firstName lastName vehicleBrand vehiclePhotoUrl photoUrl vehicleTypes')
      .sort({ date: 1, startTime: 1 })

    const byDate = {}
    const earliestStart = Date.now() + BOOKING_LEAD_MINUTES * 60 * 1000
    for (const slot of creneaux) {
      // Jamais proposer un créneau déjà passé ou trop proche du préavis.
      if (slotDateTime(slot.date, slot.startTime).getTime() <= earliestStart) continue
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
              photoUrl: slot.moniteurId.photoUrl || '',
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

/** Verrouille N créneaux consécutifs (heures d'affilée) du même moniteur à partir d'un créneau de départ. */
router.post('/creneaux/lock-range', ...withConduiteAccess, async (req, res) => {
  try {
    const startId = asId(req.body.startCreneauId)
    const moniteurId = asId(req.body.moniteurId)
    const hours = Math.max(1, Math.min(6, Number(req.body.hours) || 1))

    if (!startId || !moniteurId) {
      return res.status(400).json({ success: false, error: 'Créneau de départ et moniteur requis' })
    }

    const startCreneau = await Creneau.findOne({ _id: startId, moniteurId })
    if (!startCreneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const dayCreneaux = await Creneau.find({ moniteurId, date: startCreneau.date }).sort({
      startTime: 1,
    })
    const startIndex = dayCreneaux.findIndex((item) => String(item._id) === startId)
    if (startIndex === -1) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const chain = [dayCreneaux[startIndex]]
    for (let i = startIndex + 1; i < dayCreneaux.length && chain.length < hours; i += 1) {
      const previous = chain[chain.length - 1]
      const next = dayCreneaux[i]
      if (next.startTime !== previous.endTime) break
      chain.push(next)
    }

    if (chain.length < hours) {
      return res.status(409).json({
        success: false,
        error: `Seulement ${chain.length} créneau(x) consécutif(s) disponible(s) à partir de cette heure.`,
      })
    }

    const now = new Date()
    const lockedUntil = new Date(now.getTime() + LOCK_MS)
    const locked = []
    for (const slot of chain) {
      const updated = await Creneau.findOneAndUpdate(
        {
          _id: slot._id,
          status: 'libre',
          $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }, { lockedBy: req.user._id }],
        },
        { $set: { lockedUntil, lockedBy: req.user._id } },
        { new: true },
      )
      if (!updated) {
        for (const posed of locked) {
          await Creneau.findByIdAndUpdate(posed._id, { lockedUntil: null, lockedBy: null })
        }
        return res.status(409).json({
          success: false,
          error: 'Un des créneaux vient d’être réservé par un autre élève. Revenez au calendrier.',
        })
      }
      locked.push(updated)
    }

    res.json({
      success: true,
      data: { creneaux: locked.map((c) => c.toJSONSafe()), lockedUntil },
    })
  } catch (error) {
    console.error('Erreur verrouillage plage créneaux:', error)
    res.status(500).json({ success: false, error: 'Verrouillage impossible' })
  }
})

/** Facture / devis pour un ensemble de créneaux déjà verrouillés. */
router.post('/quote', ...withConduiteAccess, async (req, res) => {
  try {
    const creneauIds = Array.isArray(req.body.creneauIds)
      ? req.body.creneauIds.map(asId).filter(Boolean)
      : []
    if (!creneauIds.length) {
      return res.status(400).json({ success: false, error: 'Créneaux requis' })
    }

    const creneaux = await Creneau.find({ _id: { $in: creneauIds } })
      .populate('moniteurId', 'firstName lastName defaultPriceFcfa vehicleBrand vehiclePhotoUrl photoUrl')
      .sort({ startTime: 1 })
    if (creneaux.length !== creneauIds.length) {
      return res.status(404).json({ success: false, error: 'Un ou plusieurs créneaux sont introuvables' })
    }

    const moniteur = creneaux[0].moniteurId
    const hours = creneaux.reduce((sum, c) => sum + computeCreneauHeures(c), 0)
    const baseAmount = creneaux.reduce(
      (sum, c) => sum + (c.priceFcfa || moniteur?.defaultPriceFcfa || 5000),
      0,
    )
    const amount = applyHoursDiscount(baseAmount, hours)
    const soldeHeures = req.user.soldeHeures || 0

    res.json({
      success: true,
      data: {
        moniteur: moniteur
          ? {
              id: asId(moniteur._id || moniteur),
              fullName: `${moniteur.firstName} ${moniteur.lastName}`.trim(),
              vehicleBrand: moniteur.vehicleBrand || '',
              vehiclePhotoUrl: moniteur.vehiclePhotoUrl || '',
              photoUrl: moniteur.photoUrl || '',
            }
          : null,
        date: creneaux[0].date,
        startTime: creneaux[0].startTime,
        endTime: creneaux[creneaux.length - 1].endTime,
        hours,
        amount,
        baseAmount,
        hoursDiscountFcfa: Math.max(0, baseAmount - amount),
        currency: 'XOF',
        soldeHeures,
        soldeSuffisant: soldeHeures >= hours,
        creneauIds: creneaux.map((c) => String(c._id)),
      },
    })
  } catch (error) {
    console.error('Erreur devis réservation:', error)
    res.status(500).json({ success: false, error: 'Devis impossible' })
  }
})

router.post('/reservations', ...withConduiteAccess, async (req, res) => {
  try {
    const creneauIds = Array.isArray(req.body.creneauIds)
      ? req.body.creneauIds.map(asId).filter(Boolean)
      : [asId(req.body.creneauId)].filter(Boolean) // rétro-compat créneau unique
    const vehicleType = normalizeVehicleType(req.body.vehicleType)
    const moniteurId = req.body.moniteurId ? asId(req.body.moniteurId) : null
    const paymentMethod = req.body.paymentMethod === 'mobile_money' ? 'mobile_money' : 'solde'

    if (!creneauIds.length) {
      return res.status(400).json({ success: false, error: 'Créneau requis' })
    }

    const now = new Date()
    const claimed = []
    for (const creneauId of creneauIds) {
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
        { $set: { status: 'reserve', lockedUntil: null, lockedBy: null } },
        { new: true },
      )
      if (!creneau) {
        for (const item of claimed) {
          await Creneau.findByIdAndUpdate(item._id, {
            status: 'libre',
            lockedUntil: null,
            lockedBy: null,
          })
        }
        return res.status(409).json({
          success: false,
          error: 'Un des créneaux est indisponible (déjà réservé ou verrou expiré). Revenez au calendrier.',
        })
      }
      claimed.push(creneau)
    }

    async function releaseAll() {
      for (const item of claimed) {
        await Creneau.findByIdAndUpdate(item._id, {
          status: 'libre',
          lockedUntil: null,
          lockedBy: null,
        })
      }
    }

    // Après claim atomique : rejeter un chevauchement concurrent (créneaux distincts, horaires qui se croisent).
    for (const creneau of claimed) {
      const overlap = await findOverlappingBusyCreneau({
        moniteurId: creneau.moniteurId,
        date: creneau.date,
        startTime: creneau.startTime,
        endTime: creneau.endTime,
        viewerUserId: req.user._id,
        excludeIds: claimed.map((item) => item._id),
      })
      if (overlap) {
        await releaseAll()
        return res.status(409).json({
          success: false,
          error: 'Cette plage chevauche une séance déjà réservée. Revenez au calendrier.',
        })
      }
    }

    const assignedMoniteurId = moniteurId || asId(claimed[0].moniteurId)
    const bookingGroupId = new mongoose.Types.ObjectId()
    const heuresParCreneau = claimed.map((c) => computeCreneauHeures(c))
    const totalHeures = heuresParCreneau.reduce((sum, h) => sum + h, 0)

    if (paymentMethod === 'solde') {
      // Les heures sont prépayées (pack d'heures) : on débite le solde à la réservation,
      // pas à la complétion. Débit atomique conditionnel pour éviter tout découvert
      // en cas de double réservation concurrente.
      const debited = await User.findOneAndUpdate(
        { _id: req.user._id, soldeHeures: { $gte: totalHeures } },
        { $inc: { soldeHeures: -totalHeures } },
        { new: true },
      )
      if (!debited) {
        await releaseAll()
        return res.status(403).json({
          success: false,
          error: `Solde d’heures insuffisant (${totalHeures} h requises). Achetez un pack d’heures ou payez cette réservation via Mobile Money.`,
          code: 'INSUFFICIENT_HOURS',
        })
      }

      let reservations
      try {
        reservations = await Promise.all(
          claimed.map((creneau, i) =>
            Reservation.create({
              userId: req.user._id,
              moniteurId: assignedMoniteurId,
              creneauId: creneau._id,
              vehicleType: creneau.vehicleType || vehicleType,
              status: 'confirmed',
              paymentStatus: 'paid',
              paymentRef: 'solde_heures',
              bookingGroupId,
              priceFcfa: creneau.priceFcfa || 5000,
              heuresDebitees: heuresParCreneau[i],
            }),
          ),
        )
      } catch (error) {
        await releaseAll()
        await User.findByIdAndUpdate(req.user._id, { $inc: { soldeHeures: totalHeures } })
        if (error?.code === 11000) {
          return res.status(409).json({ success: false, error: 'Un des créneaux est déjà réservé' })
        }
        throw error
      }

      const hydrated = await hydrateReservationGroup(reservations)
      const moniteur = await Moniteur.findById(assignedMoniteurId)
      const first = claimed[0]
      const waText = formatReservationNotifyAdmin({
        firstName: req.user.firstName,
        date: first.date,
        startTime: first.startTime,
        moniteurName: moniteur ? `${moniteur.firstName} ${moniteur.lastName}`.trim() : '',
      })

      return res.status(201).json({
        success: true,
        data: {
          paymentMethod: 'solde',
          reservations: hydrated,
          bookingGroupId: String(bookingGroupId),
          whatsappLink: buildWhatsAppLink(ADMIN_WHATSAPP_NUMBER, waText),
          calendarHint: {
            title: 'Séance de conduite — Monpermis.bj',
            date: first.date,
            startTime: first.startTime,
            endTime: claimed[claimed.length - 1].endTime,
          },
        },
      })
    }

    // --- paymentMethod === 'mobile_money' : paiement à la réservation ---
    const requestedMode = normalizeOperatorId(req.body.operator)
    if (!requestedMode || !FEDAPAY_MOBILE_OPERATORS.includes(requestedMode)) {
      await releaseAll()
      return res.status(400).json({
        success: false,
        error: 'Réseau Mobile Money invalide. Choisissez MTN, Moov ou Celtiis.',
      })
    }

    const normalizedPhone =
      normalizeBeninPhone(req.body.phone) || normalizeBeninPhone(req.user.phone)
    if (!normalizedPhone) {
      await releaseAll()
      return res.status(400).json({
        success: false,
        error:
          'Ajoutez un numéro Mobile Money valide dans votre profil (ex. 0147880143) avant de réserver.',
        code: 'PHONE_REQUIRED',
      })
    }

    const guessed = guessBeninMobileOperator(normalizedPhone)
    let mode = requestedMode
    if (guessed && guessed !== requestedMode) {
      await releaseAll()
      return res.status(400).json({
        success: false,
        error: `Le numéro ${normalizedPhone} appartient au réseau ${operatorLabel(guessed)}, pas ${operatorLabel(requestedMode)}. Choisis « ${operatorLabel(guessed)} » puis réessaie.`,
        code: 'OPERATOR_MISMATCH',
        expectedOperator: guessed,
      })
    }
    if (guessed) mode = guessed

    const totalAmount = computeBookingAmount(claimed)
    if (totalAmount < 100) {
      await releaseAll()
      return res.status(400).json({
        success: false,
        error: 'Montant de séance invalide pour le paiement Mobile Money.',
      })
    }

    let reservations
    try {
      reservations = await Promise.all(
        claimed.map((creneau) =>
          Reservation.create({
            userId: req.user._id,
            moniteurId: assignedMoniteurId,
            creneauId: creneau._id,
            vehicleType: creneau.vehicleType || vehicleType,
            status: 'pending_payment',
            paymentStatus: 'unpaid',
            bookingGroupId,
            priceFcfa: creneau.priceFcfa || 5000,
            heuresDebitees: 0,
          }),
        ),
      )
    } catch (error) {
      await releaseAll()
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, error: 'Un des créneaux est déjà réservé' })
      }
      throw error
    }

    const payment = await Payment.create({
      userId: req.user._id,
      method: 'fedapay',
      amount: totalAmount,
      currency: 'XOF',
      status: 'pending',
      reservationGroupId: bookingGroupId,
      paymentMethod: mode,
    })
    void recordPaymentCreated(payment, {
      note: `Mobile Money (${mode}) — réservation conduite`,
    })

    try {
      configureFedaPay()
      const moniteur = await Moniteur.findById(assignedMoniteurId)
      const checkout = await sendFedaPayMobileMoney({
        amount: totalAmount,
        description: `Séance de conduite — ${moniteur ? `${moniteur.firstName} ${moniteur.lastName}`.trim() : 'Moniteur'}`,
        customer: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          phone: normalizedPhone,
          email: req.user.email,
        },
        callbackUrl: buildReservationCallbackUrl(bookingGroupId),
        customMetadata: {
          paymentId: String(payment._id),
          reservationGroupId: String(bookingGroupId),
          userId: String(req.user._id),
        },
        operator: mode,
        phone: normalizedPhone,
        country: req.body.country || 'BJ',
      })
      payment.fedapayTransactionId = checkout.transactionId
      payment.fedapayReference = checkout.reference
      payment.paymentUrl = checkout.paymentUrl || ''
      payment.paymentMethod = checkout.operator || mode
      payment.status = 'pending'
      await payment.save()
      logger.info('Retrait Mobile Money réservation initié', {
        bookingGroupId: String(bookingGroupId),
        operator: mode,
        phone: normalizedPhone,
        amount: totalAmount,
        transactionId: checkout.transactionId,
      })
    } catch (error) {
      logger.error('Échec retrait Mobile Money réservation', {
        error: error.message,
        status: error.status,
        cause: error.cause?.httpResponse?.data || error.cause?.message || null,
        bookingGroupId: String(bookingGroupId),
        operator: mode,
        phone: normalizedPhone,
      })
      payment.status = 'failed'
      payment.errorMessage = error.message
      await payment.save()
      await releaseAll()
      await Reservation.deleteMany({ bookingGroupId })
      return res.status(error.status || 502).json({
        success: false,
        error: error.message || 'Paiement Mobile Money impossible',
        code: error.code || undefined,
      })
    }

    res.status(201).json({
      success: true,
      data: {
        paymentMethod: 'mobile_money',
        bookingGroupId: String(bookingGroupId),
        payment: payment.toPublicJSON(),
        operator: mode,
        phone: normalizedPhone,
        message: 'Validez la demande de retrait sur votre téléphone.',
      },
    })
  } catch (error) {
    console.error('Erreur création réservation:', error)
    res.status(500).json({ success: false, error: 'Réservation impossible' })
  }
})

/** Réconciliation manuelle du paiement Mobile Money d'un groupe de réservations (utilisée par le poll client). */
router.get('/checkout/:groupId/sync', ...withConduiteAccess, async (req, res) => {
  try {
    configureFedaPay()
    const groupId = asObjectId(req.params.groupId)
    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Groupe de réservation invalide' })
    }

    const reservations = await Reservation.find({ bookingGroupId: groupId, userId: req.user._id })
    if (!reservations.length) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }

    const payment = await Payment.findOne({ reservationGroupId: groupId, method: 'fedapay' }).sort({
      createdAt: -1,
    })
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    }

    await syncReservationPaymentFromProvider(payment)
    let refreshedPayment = await Payment.findById(payment._id)

    // Si FedaPay a encaissé : re-garantir confirmation + exclusivité des créneaux
    // (webhook raté, race expire, ou sync partiel).
    if (refreshedPayment?.status === 'approved') {
      await applyApprovedReservationPayment(refreshedPayment, {
        eventName: 'client.sync.guarantee',
        eventId: `client-sync:${refreshedPayment._id}`,
      })
      refreshedPayment = await Payment.findById(payment._id)
    }

    const refreshedReservations = await Reservation.find({ bookingGroupId: groupId })
    const hydrated = await hydrateReservationGroup(refreshedReservations)
    const allConfirmed =
      hydrated.length > 0 && hydrated.every((item) => item.status === 'confirmed')

    res.json({
      success: true,
      data: {
        payment: refreshedPayment.toPublicJSON(),
        reservations: hydrated,
        confirmed: Boolean(refreshedPayment?.status === 'approved' && allConfirmed),
      },
    })
  } catch (error) {
    logger.error('Erreur synchronisation paiement réservation:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Synchronisation impossible',
    })
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

    // pending_payment : void FedaPay + annule le Payment du groupe avant de libérer les créneaux.
    if (reservation.status === 'pending_payment' && reservation.bookingGroupId) {
      const payment = await Payment.findOne({
        reservationGroupId: reservation.bookingGroupId,
        status: 'pending',
        method: 'fedapay',
      }).sort({ createdAt: -1 })

      if (payment) {
        const result = await cancelPendingReservationPayment(
          payment,
          reason || 'Annulé par l’utilisateur avant confirmation',
        )
        if (result.paidAlready) {
          await applyApprovedReservationPayment(result.payment || payment, {
            eventName: 'cancel.reconcile',
            eventId: `cancel-reconcile:${(result.payment || payment)._id}`,
          })
          return res.status(409).json({
            success: false,
            error: 'Le paiement vient d’être confirmé. Impossible d’annuler — contacte l’auto-école.',
          })
        }
      }

      const siblings = await Reservation.find({
        bookingGroupId: reservation.bookingGroupId,
        status: 'pending_payment',
        userId: req.user._id,
      })
      for (const sibling of siblings) {
        sibling.status = 'cancelled'
        sibling.paymentStatus = 'unpaid'
        sibling.cancelledAt = new Date()
        sibling.cancellationReason = reason
        sibling.cancelledBy = 'learner'
        await sibling.save()
        await Creneau.findByIdAndUpdate(sibling.creneauId, {
          status: 'libre',
          lockedUntil: null,
          lockedBy: null,
        })
      }

      const cancelled = siblings.find((s) => String(s._id) === String(reservation._id)) || siblings[0]
      return res.json({
        success: true,
        data: { reservation: await hydrateReservation(cancelled || reservation) },
      })
    }

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason
    reservation.cancelledBy = 'learner'
    await reservation.save()

    if (reservation.heuresDebitees > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { soldeHeures: reservation.heuresDebitees } })
    }

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

/** Job manuel / cron : rappels WhatsApp 2 h avant. Header `x-api-key: $CRON_API_KEY`. */
router.post('/reminders/run', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key']
    if (!process.env.CRON_API_KEY || apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({ success: false, error: 'Non autoris\u00e9' })
    }
    const data = await runReservationReminders()
    res.json({ success: true, data })
  } catch (error) {
    console.error('Erreur rappels:', error)
    res.status(500).json({ success: false, error: 'Rappels impossibles' })
  }
})

export default router
