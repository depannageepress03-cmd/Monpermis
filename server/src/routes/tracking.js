import { Router } from 'express'
import { LearnerTrackEvent, LEARNER_TRACK_EVENTS } from '../models/LearnerTrackEvent.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * Réception des événements de traçage mobile (batch, fire-and-forget côté client).
 * POST /api/tracking/events
 * Body : { events: [{ event, sessionId?, context?, payload?, clientTs?, appVersion?, platform? }] }
 */
router.post('/events', requireUserAuth, async (req, res) => {
  const raw = req.body?.events
  const events = Array.isArray(raw) ? raw.slice(0, 100) : []
  if (events.length === 0) {
    return res.json({ success: true, data: { inserted: 0 } })
  }

  const allowed = new Set(LEARNER_TRACK_EVENTS)
  const now = new Date()
  const docs = []
  for (const e of events) {
    const event = String(e?.event || '').trim()
    if (!allowed.has(event)) continue
    const clientTs = e?.clientTs ? new Date(e.clientTs) : null
    if (clientTs && Number.isNaN(clientTs.getTime())) continue
    docs.push({
      userId: req.user._id,
      event,
      sessionId: String(e?.sessionId || '').slice(0, 80),
      context: e?.context && typeof e?.context === 'object' ? e.context : null,
      payload: e?.payload && typeof e?.payload === 'object' ? e.payload : null,
      clientTs,
      appVersion: String(e?.appVersion || '').slice(0, 40),
      platform: String(e?.platform || '').slice(0, 20),
      createdAt: now,
    })
  }

  if (docs.length === 0) {
    return res.json({ success: true, data: { inserted: 0 } })
  }

  try {
    const inserted = await LearnerTrackEvent.insertMany(docs, { ordered: false })
    res.json({ success: true, data: { inserted: inserted.length } })
  } catch (error) {
    logger.error('Erreur insertion événements de traçage', { error: error.message })
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

export default router
