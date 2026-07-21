import { Router } from 'express'
import { Notification } from '../models/Notification.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()

/** Liste des notifications de l’utilisateur + compteur non lues. */
router.get('/', requireUserAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ userId: req.user._id, readAt: null }),
    ])
    res.json({
      success: true,
      data: {
        unreadCount,
        notifications: items.map((n) => n.toPublicJSON()),
      },
    })
  } catch (error) {
    logger.error('Erreur liste notifications', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Compteur non lues seul (léger, pour le badge). */
router.get('/unread-count', requireUserAuth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, readAt: null })
    res.json({ success: true, data: { unreadCount } })
  } catch (error) {
    logger.error('Erreur compteur notifications', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Marque une notification comme lue. */
router.patch('/:id/read', requireUserAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { readAt: new Date() },
      { new: true },
    )
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification introuvable' })
    }
    res.json({ success: true, data: { notification: notification.toPublicJSON() } })
  } catch (error) {
    logger.error('Erreur lecture notification', { error: error.message })
    res.status(500).json({ success: false, error: 'Action impossible' })
  }
})

/** Marque toutes les notifications comme lues. */
router.post('/read-all', requireUserAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { readAt: new Date() },
    )
    res.json({ success: true, data: { message: 'Notifications marquées comme lues' } })
  } catch (error) {
    logger.error('Erreur lecture globale notifications', { error: error.message })
    res.status(500).json({ success: false, error: 'Action impossible' })
  }
})

export default router
