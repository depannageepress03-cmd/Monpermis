import { Router } from 'express'
import { Announcement } from '../models/Announcement.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { imageUpload } from '../middleware/upload.js'
import { uploadImageBuffer } from '../services/cloudinary.js'
import {
  parseAnnouncementInput,
  countRecipients,
  broadcastAnnouncement,
  ANNOUNCEMENT_AUDIENCES,
} from '../services/announcements.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

/** Nombre de destinataires pour une audience (modal de confirmation). */
router.get('/recipient-count', async (req, res) => {
  try {
    const audience = ANNOUNCEMENT_AUDIENCES.includes(req.query.audience)
      ? req.query.audience
      : 'all'
    const count = await countRecipients(audience)
    res.json({ success: true, data: { audience, count } })
  } catch (error) {
    logger.error('Erreur comptage destinataires annonces', { error: error.message })
    res.status(500).json({ success: false, error: 'Comptage impossible' })
  }
})

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const status = String(req.query.status || '').trim() // active | draft | scheduled | expired | all
    const now = new Date()
    const filter = {}

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { body: { $regex: q, $options: 'i' } },
      ]
    }

    if (status === 'active') {
      filter.active = true
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ]
    } else if (status === 'draft') {
      filter.active = false
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ scheduledAt: null }, { scheduledAt: { $gt: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ]
      // brouillon = inactif sans programmation passée en attente… simplifié : inactif non expiré
    } else if (status === 'scheduled') {
      filter.active = false
      filter.scheduledAt = { $ne: null, $gt: now }
    } else if (status === 'expired') {
      filter.expiresAt = { $ne: null, $lte: now }
    }

    const items = await Announcement.find(filter).sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: { announcements: items.map((a) => a.toAdminJSON()) } })
  } catch (error) {
    logger.error('Erreur liste annonces', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Création (brouillon par défaut si active non fourni / false). */
router.post('/', audit('create', 'announcement'), async (req, res) => {
  try {
    const parsed = parseAnnouncementInput(req.body, { active: false })
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error })

    // Compat : publier (active) notifie sauf si notify:false ; draft ne notifie jamais.
    const explicitNotify = req.body?.notify
    const shouldNotify =
      parsed.data.active &&
      explicitNotify !== false &&
      (explicitNotify === true || req.body?.active === true) &&
      !(parsed.data.scheduledAt && parsed.data.scheduledAt.getTime() > Date.now())

    const announcement = await Announcement.create({
      ...parsed.data,
      createdBy: req.admin?._id ?? null,
    })

    let broadcastCount = 0
    if (shouldNotify) {
      broadcastCount = await broadcastAnnouncement(announcement)
    }

    res.status(201).json({
      success: true,
      data: { announcement: announcement.toAdminJSON(), broadcastCount },
    })
  } catch (error) {
    logger.error('Erreur création annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.post('/upload-image', (req, res) => {
  imageUpload.single('image')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucune image fournie' })
    }

    try {
      const uploaded = await uploadImageBuffer(req.file.buffer, {
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'monpermis/announcements',
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
      logger.error('Upload image annonce Cloudinary', { error: err.message })
      return res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Enregistrement image impossible',
      })
    }
  })
})

/** Publier (active + optionnellement notifier). */
router.post('/:id/publish', audit('publish', 'announcement'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) return res.status(404).json({ success: false, error: 'Annonce introuvable' })

    const notify = req.body?.notify !== false
    const now = new Date()

    if (announcement.expiresAt && announcement.expiresAt.getTime() <= now.getTime()) {
      return res.status(400).json({ success: false, error: 'Cette annonce est déjà expirée' })
    }

    // Si programmée dans le futur, on ne force pas active maintenant
    if (announcement.scheduledAt && announcement.scheduledAt.getTime() > now.getTime()) {
      return res.status(400).json({
        success: false,
        error: 'Annonce programmée : elle sera activée automatiquement à la date prévue',
      })
    }

    announcement.active = true
    announcement.scheduledAt = announcement.scheduledAt && announcement.scheduledAt > now
      ? announcement.scheduledAt
      : null
    await announcement.save()

    let broadcastCount = 0
    if (notify) {
      broadcastCount = await broadcastAnnouncement(announcement, { renotify: true })
    }

    res.json({
      success: true,
      data: { announcement: announcement.toAdminJSON(), broadcastCount },
    })
  } catch (error) {
    logger.error('Erreur publication annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Publication impossible' })
  }
})

/** Re-notifier sans modifier le contenu. */
router.post('/:id/notify', audit('notify', 'announcement'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    if (!announcement.active) {
      return res.status(400).json({
        success: false,
        error: 'Publiez l’annonce avant de notifier',
      })
    }

    const broadcastCount = await broadcastAnnouncement(announcement, { renotify: true })
    res.json({
      success: true,
      data: { announcement: announcement.toAdminJSON(), broadcastCount },
    })
  } catch (error) {
    logger.error('Erreur renotification annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Notification impossible' })
  }
})

router.patch('/:id', audit('update', 'announcement'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) return res.status(404).json({ success: false, error: 'Annonce introuvable' })

    const notify = Boolean(req.body?.notify)
    const parsed = parseAnnouncementInput(req.body, announcement.toObject())
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error })

    Object.assign(announcement, parsed.data)
    await announcement.save()

    let broadcastCount = 0
    if (notify && announcement.active) {
      broadcastCount = await broadcastAnnouncement(announcement, { renotify: true })
    }

    res.json({
      success: true,
      data: { announcement: announcement.toAdminJSON(), broadcastCount },
    })
  } catch (error) {
    logger.error('Erreur modification annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Modification impossible' })
  }
})

router.delete('/:id', audit('delete', 'announcement'), async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    res.json({ success: true, data: { message: 'Annonce supprimée' } })
  } catch (error) {
    logger.error('Erreur suppression annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

export default router
