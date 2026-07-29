import { Router } from 'express'
import { Announcement } from '../models/Announcement.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import {
  publicAnnouncementFilter,
  userMatchesAudience,
} from '../services/announcements.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * Fil d’actualités : annonces actives visibles pour l’utilisateur
 * (filtre audience all / active / code / conduite).
 */
router.get('/', requireUserAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const items = await Announcement.find(publicAnnouncementFilter())
      .sort({ createdAt: -1 })
      .limit(Math.min(limit * 3, 100))

    const visible = []
    for (const item of items) {
      if (await userMatchesAudience(req.user, item.audience || 'all')) {
        visible.push(item)
      }
      if (visible.length >= limit) break
    }

    res.json({
      success: true,
      data: { announcements: visible.map((a) => a.toPublicJSON()) },
    })
  } catch (error) {
    logger.error('Erreur liste annonces publiques', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Détail + incrément impression (best-effort). */
router.get('/:id', requireUserAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement || !announcement.active) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    }

    const now = new Date()
    if (announcement.expiresAt && announcement.expiresAt.getTime() <= now.getTime()) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    }
    if (announcement.scheduledAt && announcement.scheduledAt.getTime() > now.getTime()) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    }

    if (!(await userMatchesAudience(req.user, announcement.audience || 'all'))) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    }

    // Compteur de vues (non bloquant)
    Announcement.updateOne({ _id: announcement._id }, { $inc: { viewCount: 1 } }).catch(() => {})

    res.json({ success: true, data: { announcement: announcement.toPublicJSON() } })
  } catch (error) {
    logger.error('Erreur détail annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Impression légère sans recharger le détail. */
router.post('/:id/view', requireUserAuth, async (req, res) => {
  try {
    const result = await Announcement.updateOne(
      { _id: req.params.id, active: true },
      { $inc: { viewCount: 1 } },
    )
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' })
    }
    res.json({ success: true, data: { ok: true } })
  } catch (error) {
    logger.error('Erreur vue annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

export default router
