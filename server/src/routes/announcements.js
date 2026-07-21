import { Router } from 'express'
import { Announcement } from '../models/Announcement.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()

/** Annonces actives, pour le fil d’actualités mobile. */
router.get('/', requireUserAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const items = await Announcement.find({ active: true }).sort({ createdAt: -1 }).limit(limit)
    res.json({ success: true, data: { announcements: items.map((a) => a.toPublicJSON()) } })
  } catch (error) {
    logger.error('Erreur liste annonces publiques', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
