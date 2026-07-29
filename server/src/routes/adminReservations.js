import { Router } from 'express'
import mongoose from 'mongoose'
import { Moniteur, MONITEUR_BIO_MAX, MONITEUR_PHOTOS_MAX, MONITEUR_VIDEOS_MAX } from '../models/Moniteur.js'
import { Creneau } from '../models/Creneau.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { imageUpload } from '../middleware/upload.js'
import { notifyUser } from '../services/notifications.js'
import { uploadImageBuffer } from '../services/cloudinary.js'
import { logger } from '../utils/logger.js'
import {
  formatLocalDate,
  normalizeVehicleType,
  parseLocalDate,
} from '../utils/localDate.js'
import { creditHeuresEffectueesForCompletion } from '../utils/reservationLifecycle.js'
import { filterAllowedMoniteurVideos } from '../utils/moniteurVideos.js'

function asObjectId(value) {
  if (!value) return null
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value)
  }
  return null
}

const router = Router()
router.use(requireAdminAuth)

function parseVehicleTypes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return ['voiture']
  const cleaned = [
    ...new Set(
      raw
        .map((item) => normalizeVehicleType(item, ''))
        .filter((item) => item.length >= 2),
    ),
  ]
  return cleaned.length > 0 ? cleaned : ['voiture']
}

function parseUrlList(raw, max = 50) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    const url = String(item || '').trim()
    if (!url) continue
    if (!out.includes(url)) out.push(url)
    if (out.length >= max) break
  }
  return out
}

function parsePhotosList(raw) {
  return parseUrlList(raw, MONITEUR_PHOTOS_MAX)
}

function parseVideosList(raw) {
  return filterAllowedMoniteurVideos(raw, MONITEUR_VIDEOS_MAX)
}

function clampBio(value) {
  return String(value || '').trim().slice(0, MONITEUR_BIO_MAX)
}

router.get('/moniteurs', async (_req, res) => {
  try {
    const moniteurs = await Moniteur.find().sort({ lastName: 1, firstName: 1 })
    res.json({
      success: true,
      data: { moniteurs: moniteurs.map((item) => item.toJSONSafe()) },
    })
  } catch (error) {
    logger.error('Erreur liste moniteurs', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/moniteurs', audit('create', 'moniteur'), async (req, res) => {
  try {
    let firstName = String(req.body.firstName || '').trim()
    let lastName = String(req.body.lastName || '').trim()
    const fullName = String(req.body.fullName || req.body.name || '').trim()

    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean)
      firstName = parts[0] || fullName
      lastName = parts.slice(1).join(' ') || '—'
    }

    if (firstName.length < 2) {
      return res.status(400).json({ success: false, error: 'Nom du moniteur requis' })
    }
    if (lastName.length < 1) lastName = '—'

    const moniteur = await Moniteur.create({
      firstName,
      lastName,
      phone: String(req.body.phone || '').trim(),
      specialties: Array.isArray(req.body.specialties)
        ? req.body.specialties.map((item) => String(item).trim()).filter(Boolean)
        : [],
      vehicleTypes: parseVehicleTypes(req.body.vehicleTypes),
      weeklyAvailability: Array.isArray(req.body.weeklyAvailability)
        ? req.body.weeklyAvailability
        : [
            { dayOfWeek: 1, start: '08:00', end: '12:00' },
            { dayOfWeek: 1, start: '14:00', end: '18:00' },
            { dayOfWeek: 2, start: '08:00', end: '12:00' },
            { dayOfWeek: 2, start: '14:00', end: '18:00' },
            { dayOfWeek: 3, start: '08:00', end: '12:00' },
            { dayOfWeek: 3, start: '14:00', end: '18:00' },
            { dayOfWeek: 4, start: '08:00', end: '12:00' },
            { dayOfWeek: 4, start: '14:00', end: '18:00' },
            { dayOfWeek: 5, start: '08:00', end: '12:00' },
            { dayOfWeek: 5, start: '14:00', end: '18:00' },
          ],
      active: req.body.active !== false,
      defaultPriceFcfa: Number(req.body.defaultPriceFcfa) || 5000,
      vehicleBrand: String(req.body.vehicleBrand || '').trim(),
      vehiclePhotoUrl: String(req.body.vehiclePhotoUrl || '').trim(),
      photoUrl: String(req.body.photoUrl || '').trim(),
      city: String(req.body.city || '').trim(),
      bio: clampBio(req.body.bio),
      photos: parsePhotosList(req.body.photos),
      videos: parseVideosList(req.body.videos),
    })

    res.status(201).json({ success: true, data: { moniteur: moniteur.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur création moniteur:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/moniteurs/:id', audit('update', 'moniteur'), async (req, res) => {
  try {
    const moniteur = await Moniteur.findById(req.params.id)
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }

    if (req.body.fullName !== undefined || req.body.name !== undefined) {
      const fullName = String(req.body.fullName || req.body.name || '').trim()
      const parts = fullName.split(/\s+/).filter(Boolean)
      if (parts.length >= 1) {
        moniteur.firstName = parts[0]
        moniteur.lastName = parts.slice(1).join(' ') || '—'
      }
    }
    if (req.body.firstName !== undefined) moniteur.firstName = String(req.body.firstName).trim()
    if (req.body.lastName !== undefined) moniteur.lastName = String(req.body.lastName).trim()
    if (req.body.phone !== undefined) moniteur.phone = String(req.body.phone).trim()
    if (req.body.specialties !== undefined) {
      moniteur.specialties = Array.isArray(req.body.specialties)
        ? req.body.specialties.map((item) => String(item).trim()).filter(Boolean)
        : []
    }
    if (req.body.vehicleTypes !== undefined) {
      moniteur.vehicleTypes = parseVehicleTypes(req.body.vehicleTypes)
    }
    if (req.body.weeklyAvailability !== undefined) {
      moniteur.weeklyAvailability = Array.isArray(req.body.weeklyAvailability)
        ? req.body.weeklyAvailability
        : []
    }
    if (req.body.active !== undefined) moniteur.active = Boolean(req.body.active)
    if (req.body.defaultPriceFcfa !== undefined) {
      moniteur.defaultPriceFcfa = Number(req.body.defaultPriceFcfa) || 5000
    }
    if (req.body.vehicleBrand !== undefined) {
      moniteur.vehicleBrand = String(req.body.vehicleBrand).trim()
    }
    if (req.body.vehiclePhotoUrl !== undefined) {
      moniteur.vehiclePhotoUrl = String(req.body.vehiclePhotoUrl).trim()
    }
    if (req.body.photoUrl !== undefined) {
      moniteur.photoUrl = String(req.body.photoUrl).trim()
    }
    if (req.body.city !== undefined) {
      moniteur.city = String(req.body.city).trim()
    }
    if (req.body.bio !== undefined) {
      moniteur.bio = clampBio(req.body.bio)
    }
    if (req.body.photos !== undefined) {
      moniteur.photos = parsePhotosList(req.body.photos)
    }
    if (req.body.videos !== undefined) {
      const rawVideos = Array.isArray(req.body.videos) ? req.body.videos : []
      const allowed = parseVideosList(rawVideos)
      const cleanedRaw = rawVideos.map((item) => String(item || '').trim()).filter(Boolean)
      if (cleanedRaw.length > 0 && allowed.length < cleanedRaw.length) {
        return res.status(400).json({
          success: false,
          error: 'Vidéos : uniquement des liens YouTube ou Vimeo (https).',
        })
      }
      moniteur.videos = allowed
    }

    await moniteur.save()
    res.json({ success: true, data: { moniteur: moniteur.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur maj moniteur:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/moniteurs/:id', audit('delete', 'moniteur'), async (req, res) => {
  try {
    const moniteur = await Moniteur.findByIdAndDelete(req.params.id)
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }
    await Creneau.deleteMany({ moniteurId: moniteur._id, status: 'libre' })
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    logger.error('Erreur suppression moniteur:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Génère des créneaux horaires pour une plage de dates. */
router.post('/creneaux/generate', audit('generate', 'creneau'), async (req, res) => {
  try {
    const moniteurId = req.body.moniteurId
    const fromDate = String(req.body.fromDate || '').trim()
    const toDate = String(req.body.toDate || '').trim()
    const slotMinutes = Number(req.body.slotMinutes) || 60

    if (!moniteurId || !fromDate || !toDate) {
      return res.status(400).json({ success: false, error: 'Moniteur et dates requis' })
    }

    const moniteur = await Moniteur.findById(moniteurId)
    if (!moniteur || !moniteur.active) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }

    const vehicleType = normalizeVehicleType(
      req.body.vehicleType ||
        (Array.isArray(moniteur.vehicleTypes) && moniteur.vehicleTypes[0]) ||
        'voiture',
    )

    const start = parseLocalDate(fromDate)
    const end = parseLocalDate(toDate)
    if (!start || !end || end < start) {
      return res.status(400).json({ success: false, error: 'Plage de dates invalide' })
    }

    const created = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const dateStr = formatLocalDate(cursor)
      const dayOfWeek = cursor.getDay()
      const windows = (moniteur.weeklyAvailability || []).filter(
        (slot) => slot.dayOfWeek === dayOfWeek,
      )

      for (const window of windows) {
        const [sh, sm] = String(window.start || '08:00').split(':').map(Number)
        const [eh, em] = String(window.end || '18:00').split(':').map(Number)
        let minutes = sh * 60 + (sm || 0)
        const endMinutes = eh * 60 + (em || 0)

        while (minutes + slotMinutes <= endMinutes) {
          const startH = String(Math.floor(minutes / 60)).padStart(2, '0')
          const startM = String(minutes % 60).padStart(2, '0')
          const endTotal = minutes + slotMinutes
          const endH = String(Math.floor(endTotal / 60)).padStart(2, '0')
          const endM = String(endTotal % 60).padStart(2, '0')
          const startTime = `${startH}:${startM}`
          const endTime = `${endH}:${endM}`

          try {
            const creneau = await Creneau.create({
              moniteurId: moniteur._id,
              date: dateStr,
              startTime,
              endTime,
              vehicleType,
              status: 'libre',
              priceFcfa: moniteur.defaultPriceFcfa || 5000,
            })
            created.push(creneau.toJSONSafe())
          } catch {
            // doublon unique index → ignore
          }

          minutes += slotMinutes
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    res.status(201).json({
      success: true,
      data: { createdCount: created.length, creneaux: created },
    })
  } catch (error) {
    logger.error('Erreur génération créneaux:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

/** Crée un créneau unique avec horaires saisis par l’admin. */
router.post('/creneaux', audit('create', 'creneau'), async (req, res) => {
  try {
    const moniteurId = req.body.moniteurId
    const date = String(req.body.date || '').trim().slice(0, 10)
    const startTime = String(req.body.startTime || '').trim().slice(0, 5)
    const endTime = String(req.body.endTime || '').trim().slice(0, 5)

    if (!moniteurId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Moniteur, date, heure de début et heure de fin requis',
      })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Date invalide (AAAA-MM-JJ)' })
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ success: false, error: 'Horaires invalides (HH:mm)' })
    }
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    if (!(endMinutes > startMinutes)) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après l’heure de début' })
    }

    const moniteur = await Moniteur.findById(moniteurId)
    if (!moniteur || !moniteur.active) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }

    const vehicleType = normalizeVehicleType(
      req.body.vehicleType ||
        (Array.isArray(moniteur.vehicleTypes) && moniteur.vehicleTypes[0]) ||
        'voiture',
    )
    const priceFcfa =
      req.body.priceFcfa !== undefined
        ? Number(req.body.priceFcfa) || 0
        : moniteur.defaultPriceFcfa || 5000

    try {
      const creneau = await Creneau.create({
        moniteurId: moniteur._id,
        date,
        startTime,
        endTime,
        vehicleType,
        status: 'libre',
        priceFcfa,
      })
      return res.status(201).json({ success: true, data: { creneau: creneau.toJSONSafe() } })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Un créneau existe déjà à cette date et cette heure pour ce moniteur',
        })
      }
      throw error
    }
  } catch (error) {
    logger.error('Erreur création créneau:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.get('/creneaux', async (req, res) => {
  try {
    const filter = {}
    if (req.query.date) filter.date = String(req.query.date).slice(0, 20)
    if (req.query.from && req.query.to) {
      filter.date = { $gte: String(req.query.from).slice(0, 20), $lte: String(req.query.to).slice(0, 20) }
    }
    if (req.query.moniteurId) {
      const oid = asObjectId(req.query.moniteurId)
      if (oid) filter.moniteurId = oid
    }
    if (req.query.status) filter.status = String(req.query.status).slice(0, 30)

    const creneaux = await Creneau.find(filter).sort({ date: 1, startTime: 1 }).limit(500)
    res.json({
      success: true,
      data: { creneaux: creneaux.map((item) => item.toJSONSafe()) },
    })
  } catch (error) {
    logger.error('Erreur liste créneaux:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/creneaux/:id', audit('update', 'creneau'), async (req, res) => {
  try {
    const creneau = await Creneau.findById(req.params.id)
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }
    if (creneau.status === 'reserve' && (req.body.startTime || req.body.endTime || req.body.date)) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de modifier un créneau déjà réservé',
      })
    }
    if (req.body.status !== undefined) {
      const status = String(req.body.status)
      if (!['libre', 'reserve', 'bloque'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Statut invalide' })
      }
      creneau.status = status
    }
    if (req.body.priceFcfa !== undefined) {
      creneau.priceFcfa = Number(req.body.priceFcfa) || 0
    }
    if (req.body.date !== undefined) {
      const date = String(req.body.date).trim().slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: 'Date invalide' })
      }
      creneau.date = date
    }
    if (req.body.startTime !== undefined) {
      const startTime = String(req.body.startTime).trim().slice(0, 5)
      if (!/^\d{2}:\d{2}$/.test(startTime)) {
        return res.status(400).json({ success: false, error: 'Heure de début invalide' })
      }
      creneau.startTime = startTime
    }
    if (req.body.endTime !== undefined) {
      const endTime = String(req.body.endTime).trim().slice(0, 5)
      if (!/^\d{2}:\d{2}$/.test(endTime)) {
        return res.status(400).json({ success: false, error: 'Heure de fin invalide' })
      }
      creneau.endTime = endTime
    }
    const [sh, sm] = String(creneau.startTime).split(':').map(Number)
    const [eh, em] = String(creneau.endTime).split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après l’heure de début' })
    }
    await creneau.save()
    res.json({ success: true, data: { creneau: creneau.toJSONSafe() } })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, error: 'Créneau en conflit avec un autre horaire' })
    }
    logger.error('Erreur maj créneau:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/creneaux/:id', audit('delete', 'creneau'), async (req, res) => {
  try {
    const creneau = await Creneau.findById(req.params.id)
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }
    if (creneau.status === 'reserve') {
      return res.status(400).json({
        success: false,
        error: 'Ce créneau est réservé. Supprimez d’abord la réservation.',
      })
    }
    await creneau.deleteOne()
    res.json({ success: true, data: { deleted: true, id: String(req.params.id) } })
  } catch (error) {
    logger.error('Erreur suppression créneau:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.get('/reservations', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status) filter.status = String(req.query.status).slice(0, 30)
    if (req.query.paymentStatus) filter.paymentStatus = String(req.query.paymentStatus).slice(0, 30)
    if (req.query.moniteurId) filter.moniteurtId = req.query.moniteurtId
    if (req.query.userId) filter.userId = req.query.userId

    const reservations = await Reservation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName phone email')
      .populate('moniteurId', 'firstName lastName vehicleBrand vehiclePhotoUrl')
      .populate('creneauId')

    const total = await Reservation.countDocuments(filter)
    res.json({
      success: true,
      data: {
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        reservations: reservations.map((item) => {
          const user = item.userId
          const moniteur = item.moniteurId
          const creneau = item.creneauId
          return item.toJSONSafe({
            user: user
              ? {
                  id: String(user._id || user),
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                  phone: user.phone || '',
                  email: user.email || '',
                }
              : null,
            moniteur: moniteur
              ? {
                  id: String(moniteur._id || moniteur),
                  fullName: `${moniteur.firstName || ''} ${moniteur.lastName || ''}`.trim(),
                  vehicleBrand: moniteur.vehicleBrand || '',
                  vehiclePhotoUrl: moniteur.vehiclePhotoUrl || '',
                }
              : null,
            creneau: creneau?.toJSONSafe?.() ?? null,
          })
        }),
      },
    })
  } catch (error) {
    logger.error('Erreur liste réservations:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Supprime une réservation, libère le créneau et recrédite les heures si non effectuée. */
router.delete('/reservations/:id', audit('delete', 'reservation'), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }

    const creneauId = reservation.creneauId
    if (reservation.status !== 'completed' && reservation.heuresDebitees > 0 && reservation.userId) {
      await User.findByIdAndUpdate(reservation.userId, { $inc: { soldeHeures: reservation.heuresDebitees } })
    }
    await Reservation.findByIdAndDelete(reservation._id)

    if (creneauId) {
      await Creneau.findByIdAndUpdate(creneauId, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
    }

    res.json({ success: true, data: { deleted: true, id: String(reservation._id) } })
  } catch (error) {
    logger.error('Erreur suppression réservation:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.patch('/reservations/:id', audit('update', 'reservation'), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }

    if (req.body.status) {
      if (!['pending_payment', 'confirmed', 'cancelled', 'completed'].includes(req.body.status)) {
        return res.status(400).json({ success: false, error: 'Statut invalide' })
      }

      if (req.body.status === 'completed' && reservation.status !== 'completed') {
        // Réservations post-pack d'heures : déjà débitées à la réservation, on ne
        // fait qu'enregistrer les heures effectuées. Réservations antérieures
        // (heuresDebitees=0, ancien flux) : comportement historique conservé.
        await creditHeuresEffectueesForCompletion(reservation)
      }

      reservation.status = req.body.status
    }

    await reservation.save()
    res.json({ success: true, data: { reservation: reservation.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur maj réservation', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

/** Annule une réservation (conserve l’historique) et libère le créneau. */
router.post('/reservations/:id/cancel', audit('cancel', 'reservation'), async (req, res) => {
  try {
    const reason = String(req.body.reason || req.body.cancellationReason || '').trim()
    const reservation = await Reservation.findById(req.params.id).populate('creneauId')
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Déjà annulée' })
    }

    const shouldRefundHours = reservation.status !== 'completed' && reservation.heuresDebitees > 0

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason || 'Annulée par l’administration'
    reservation.cancelledBy = 'admin'
    await reservation.save()

    if (shouldRefundHours) {
      await User.findByIdAndUpdate(reservation.userId, { $inc: { soldeHeures: reservation.heuresDebitees } })
    }

    if (reservation.userId) {
      await notifyUser(reservation.userId, {
        type: 'reservation_cancelled',
        title: 'Réservation annulée',
        body: reservation.cancellationReason || 'Ta réservation de leçon a été annulée par l’auto-école.',
        link: 'conduite',
      })
    }

    if (reservation.creneauId?._id || reservation.creneauId) {
      await Creneau.findByIdAndUpdate(reservation.creneauId._id || reservation.creneauId, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
    }

    res.json({ success: true, data: { reservation: reservation.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur annulation admin:', error)
    res.status(500).json({ success: false, error: 'Annulation impossible' })
  }
})

router.patch('/users/:userId/heures', audit('update', 'solde_heures'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
    }
    if (req.body.soldeHeures !== undefined) {
      user.soldeHeures = Math.max(0, Number(req.body.soldeHeures) || 0)
    }
    if (req.body.heuresEffectuees !== undefined) {
      user.heuresEffectuees = Math.max(0, Number(req.body.heuresEffectuees) || 0)
    }
    if (req.body.heuresObjectif !== undefined) {
      user.heuresObjectif = Math.max(1, Number(req.body.heuresObjectif) || 20)
    }
    await user.save()
    res.json({ success: true, data: { user: user.toAdminJSON() } })
  } catch (error) {
    logger.error('Erreur maj heures:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/upload-vehicle-photo', (req, res) => {
  imageUpload.single('image')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucune photo fournie' })
    }

    try {
      const uploaded = await uploadImageBuffer(req.file.buffer, {
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'monpermis/conduite',
      })
      res.status(201).json({
        success: true,
        data: {
          imageUrl: uploaded.imageUrl,
          imagePublicId: uploaded.imagePublicId,
          mediaBytes: uploaded.bytes,
        },
      })
    } catch (err) {
      logger.error('Upload photo conduite Cloudinary:', err)
      return res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Enregistrement photo impossible',
      })
    }
  })
})

export default router
