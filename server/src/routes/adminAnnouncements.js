import { Router } from 'express'
import { Announcement } from '../models/Announcement.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { notifyManyUsers } from '../services/notifications.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

const KINDS = ['info', 'promo', 'alerte']

function parseBody(body) {
  const title = String(body?.title ?? '').trim()
  const text = String(body?.body ?? '').trim()
  const kind = KINDS.includes(body?.kind) ? body.kind : 'info'
  const active = body?.active === undefined ? true : Boolean(body.active)
  if (!title) return { error: 'Le titre est requis' }
  if (title.length > 160) return { error: 'Titre trop long (160 max)' }
  return { data: { title, body: text, kind, active } }
}

router.get('/', async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: { announcements: items.map((a) => a.toAdminJSON()) } })
  } catch (error) {
    logger.error('Erreur liste annonces', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/', async (req, res) => {
  try {
    const parsed = parseBody(req.body)
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error })

    const announcement = await Announcement.create({
      ...parsed.data,
      createdBy: req.admin?._id ?? null,
    })

    // Diffusion en notification à tous les utilisateurs si l’annonce est active.
    let broadcastCount = 0
    if (announcement.active) {
      const userIds = await User.find().distinct('_id')
      broadcastCount = await notifyManyUsers(userIds, {
        type: 'announcement',
        title: announcement.title,
        body: announcement.body,
        link: 'notifications',
      })
      announcement.broadcastAt = new Date()
      await announcement.save()
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

router.patch('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) return res.status(404).json({ success: false, error: 'Annonce introuvable' })

    const parsed = parseBody({ ...announcement.toObject(), ...req.body })
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error })

    announcement.title = parsed.data.title
    announcement.body = parsed.data.body
    announcement.kind = parsed.data.kind
    announcement.active = parsed.data.active
    await announcement.save()

    res.json({ success: true, data: { announcement: announcement.toAdminJSON() } })
  } catch (error) {
    logger.error('Erreur modification annonce', { error: error.message })
    res.status(500).json({ success: false, error: 'Modification impossible' })
  }
})

router.delete('/:id', async (req, res) => {
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
