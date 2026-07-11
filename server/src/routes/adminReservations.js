import { Router } from 'express'
import { Moniteur } from '../models/Moniteur.js'
import { Creneau } from '../models/Creneau.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { imageUpload } from '../middleware/upload.js'
import {
  formatLocalDate,
  normalizeVehicleType,
  parseLocalDate,
} from '../utils/localDate.js'

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

router.get('/moniteurs', async (_req, res) => {
  try {
    const moniteurs = await Moniteur.find().sort({ lastName: 1, firstName: 1 })
    res.json({
      success: true,
      data: { moniteurs: moniteurs.map((item) => item.toJSONSafe()) },
    })
  } catch (error) {
    console.error('Erreur liste moniteurs:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/moniteurs', async (req, res) => {
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
    })

    res.status(201).json({ success: true, data: { moniteur: moniteur.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur création moniteur:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/moniteurs/:id', async (req, res) => {
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

    await moniteur.save()
    res.json({ success: true, data: { moniteur: moniteur.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur maj moniteur:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/moniteurs/:id', async (req, res) => {
  try {
    const moniteur = await Moniteur.findByIdAndDelete(req.params.id)
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression moniteur:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Génère des créneaux horaires pour une plage de dates. */
router.post('/creneaux/generate', async (req, res) => {
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
    console.error('Erreur génération créneaux:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

router.get('/creneaux', async (req, res) => {
  try {
    const filter = {}
    if (req.query.date) filter.date = String(req.query.date)
    if (req.query.from && req.query.to) {
      filter.date = { $gte: String(req.query.from), $lte: String(req.query.to) }
    }
    if (req.query.moniteurId) filter.moniteurId = req.query.moniteurId
    if (req.query.status) filter.status = String(req.query.status)

    const creneaux = await Creneau.find(filter).sort({ date: 1, startTime: 1 }).limit(500)
    res.json({
      success: true,
      data: { creneaux: creneaux.map((item) => item.toJSONSafe()) },
    })
  } catch (error) {
    console.error('Erreur liste créneaux:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/creneaux/:id', async (req, res) => {
  try {
    const creneau = await Creneau.findById(req.params.id)
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
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
    await creneau.save()
    res.json({ success: true, data: { creneau: creneau.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur maj créneau:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.get('/reservations', async (_req, res) => {
  try {
    const reservations = await Reservation.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('userId', 'firstName lastName phone email')
      .populate('moniteurId', 'firstName lastName vehicleBrand vehiclePhotoUrl')
      .populate('creneauId')

    res.json({
      success: true,
      data: {
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
    console.error('Erreur liste réservations:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/reservations/:id/payment', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }

    const paymentStatus = String(req.body.paymentStatus || '')
    if (!['unpaid', 'pending_validation', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, error: 'Statut paiement invalide' })
    }

    reservation.paymentStatus = paymentStatus
    if (req.body.paymentRef !== undefined) {
      reservation.paymentRef = String(req.body.paymentRef).trim()
    }
    if (paymentStatus === 'paid' && reservation.status === 'pending_payment') {
      reservation.status = 'confirmed'
    }
    await reservation.save()

    res.json({ success: true, data: { reservation: reservation.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur validation paiement:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

/** Supprime une réservation et libère le créneau associé. */
router.delete('/reservations/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }

    const creneauId = reservation.creneauId
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
    console.error('Erreur suppression réservation:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Annule une réservation (conserve l’historique) et libère le créneau. */
router.post('/reservations/:id/cancel', async (req, res) => {
  try {
    const reason = String(req.body.reason || req.body.cancellationReason || '').trim()
    const reservation = await Reservation.findById(req.params.id).populate('creneauId')
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' })
    }
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Déjà annulée' })
    }

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason || 'Annulée par l’administration'
    reservation.cancelledBy = 'admin'
    await reservation.save()

    if (reservation.creneauId?._id || reservation.creneauId) {
      await Creneau.findByIdAndUpdate(reservation.creneauId._id || reservation.creneauId, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
    }

    res.json({ success: true, data: { reservation: reservation.toJSONSafe() } })
  } catch (error) {
    console.error('Erreur annulation admin:', error)
    res.status(500).json({ success: false, error: 'Annulation impossible' })
  }
})

router.patch('/users/:userId/heures', async (req, res) => {
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
    console.error('Erreur maj heures:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/upload-vehicle-photo', (req, res) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucune photo fournie' })
    }

    res.status(201).json({
      success: true,
      data: {
        imageUrl: `/uploads/images/${req.file.filename}`,
        mediaBytes: req.file.size || 0,
      },
    })
  })
})

export default router
