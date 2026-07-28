import { Router } from 'express'
import mongoose from 'mongoose'
import { Moniteur } from '../models/Moniteur.js'
import { Creneau } from '../models/Creneau.js'
import { Reservation } from '../models/Reservation.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { requireUserAuth } from '../middleware/userAuth.js'
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
import { computeCreneauHeures } from '../utils/creneauDuration.js'
import { configureFedaPay, sendFedaPayMobileMoney } from '../services/fedapay.js'
import {
  buildReservationCallbackUrl,
  syncReservationPaymentFromProvider,
} from '../utils/reservationPayments.js'
import { logger } from '../utils/logger.js'

const router = Router()
/** Réservations : auth seule — le solde d’heures est contrôlé à la création. */
const withConduiteAccess = [requireUserAuth]
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

async function hydrateReservationGroup(reservations) {
  return Promise.all(reservations.map((reservation) => hydrateReservation(reservation)))
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
      .populate('moniteurId', 'firstName lastName defaultPriceFcfa vehicleBrand vehiclePhotoUrl')
      .sort({ startTime: 1 })
    if (creneaux.length !== creneauIds.length) {
      return res.status(404).json({ success: false, error: 'Un ou plusieurs créneaux sont introuvables' })
    }

    const moniteur = creneaux[0].moniteurId
    const hours = creneaux.reduce((sum, c) => sum + computeCreneauHeures(c), 0)
    const amount = creneaux.reduce(
      (sum, c) => sum + (c.priceFcfa || moniteur?.defaultPriceFcfa || 5000),
      0,
    )
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
            }
          : null,
        date: creneaux[0].date,
        startTime: creneaux[0].startTime,
        endTime: creneaux[creneaux.length - 1].endTime,
        hours,
        amount,
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
      const waText = formatReservationReminder({
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
          whatsappLink: buildWhatsAppLink(req.user.phone, waText),
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
    const totalAmount = claimed.reduce((sum, c) => sum + (c.priceFcfa || 5000), 0)

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
          phone: req.user.phone,
          email: req.user.email,
        },
        callbackUrl: buildReservationCallbackUrl(bookingGroupId),
        customMetadata: {
          paymentId: String(payment._id),
          reservationGroupId: String(bookingGroupId),
          userId: String(req.user._id),
        },
        operator: req.body.operator,
        phone: req.body.phone,
        country: req.body.country || 'BJ',
      })
      payment.fedapayTransactionId = checkout.transactionId
      payment.fedapayReference = checkout.reference
      payment.paymentUrl = checkout.paymentUrl
      payment.paymentMethod = checkout.fedapayMode || ''
      await payment.save()
    } catch (error) {
      payment.status = 'failed'
      payment.errorMessage = error.message
      await payment.save()
      await releaseAll()
      await Reservation.deleteMany({ bookingGroupId })
      return res.status(error.status || 502).json({
        success: false,
        error: error.message || 'Paiement Mobile Money impossible',
      })
    }

    res.status(201).json({
      success: true,
      data: {
        paymentMethod: 'mobile_money',
        bookingGroupId: String(bookingGroupId),
        payment: payment.toPublicJSON(),
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
    const refreshedPayment = await Payment.findById(payment._id)
    const refreshedReservations = await Reservation.find({ bookingGroupId: groupId })
    const hydrated = await hydrateReservationGroup(refreshedReservations)

    res.json({
      success: true,
      data: {
        payment: refreshedPayment.toPublicJSON(),
        reservations: hydrated,
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
