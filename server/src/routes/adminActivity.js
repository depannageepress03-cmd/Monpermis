import { Router } from 'express'
import { ActivityEvent } from '../models/ActivityEvent.js'
import { Admin } from '../models/Admin.js'
import { AuditLog } from '../models/AuditLog.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth.js'
import {
  addActivityEventClient,
  removeActivityEventClient,
} from '../services/activityEvents.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth, requireSuperAdmin)

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Cockpit : KPIs admins + activité + compta du jour. */
router.get('/cockpit', async (_req, res) => {
  try {
    const today = startOfDay()
    const monthStart = startOfMonth()

    const [
      adminsTotal,
      adminsActive,
      superadmins,
      adminsOnlineRecent,
      activityToday,
      activityRecent,
      usersToday,
      paymentsMonth,
      paymentsToday,
      needsRefund,
    ] = await Promise.all([
      Admin.countDocuments(),
      Admin.countDocuments({ isActive: true }),
      Admin.countDocuments({ role: 'superadmin', isActive: true }),
      Admin.countDocuments({
        isActive: true,
        lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      ActivityEvent.countDocuments({ createdAt: { $gte: today } }),
      ActivityEvent.find().sort({ createdAt: -1 }).limit(40),
      User.countDocuments({ createdAt: { $gte: today } }),
      Payment.find({
        status: 'approved',
        $or: [{ paidAt: { $gte: monthStart } }, { createdAt: { $gte: monthStart } }],
      })
        .select('amount')
        .lean(),
      Payment.find({
        status: 'approved',
        $or: [{ paidAt: { $gte: today } }, { createdAt: { $gte: today } }],
      })
        .select('amount')
        .lean(),
      Payment.countDocuments({ needsRefund: true, refundResolvedAt: null }),
    ])

    const sumAmount = (rows) => rows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

    const recentAdmins = await Admin.find()
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(8)
      .select('-password')

    res.json({
      success: true,
      data: {
        admins: {
          total: adminsTotal,
          active: adminsActive,
          superadmins,
          activeLast24h: adminsOnlineRecent,
          recent: recentAdmins.map((a) => ({
            id: String(a._id),
            fullName: a.fullName,
            phone: a.phone,
            role: a.role,
            isActive: a.isActive,
            lastLoginAt: a.lastLoginAt || null,
          })),
        },
        activity: {
          today: activityToday,
          recent: activityRecent.map((e) => e.toPublicJSON()),
        },
        users: {
          registeredToday: usersToday,
        },
        finances: {
          currency: 'XOF',
          todayEncaisse: sumAmount(paymentsToday),
          monthEncaisse: sumAmount(paymentsMonth),
          needsRefund,
        },
      },
    })
  } catch (error) {
    logger.error('Erreur cockpit superadmin', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Fil d’activité paginé + filtres. */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const filter = {}
    const actorType = String(req.query.actorType || '').trim()
    if (actorType && ['admin', 'user', 'system'].includes(actorType)) {
      filter.actorType = actorType
    }

    const action = String(req.query.action || '').trim()
    if (action) filter.action = action

    const resource = String(req.query.resource || '').trim()
    if (resource) filter.resource = resource

    const actorId = String(req.query.actorId || '').trim()
    if (actorId) filter.actorId = actorId

    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (from || to) {
      filter.createdAt = {}
      if (from) {
        const d = new Date(from)
        if (!Number.isNaN(d.getTime())) filter.createdAt.$gte = d
      }
      if (to) {
        const d = new Date(to)
        if (!Number.isNaN(d.getTime())) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setHours(23, 59, 59, 999)
          filter.createdAt.$lte = d
        }
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt
    }

    const q = String(req.query.q || '').trim()
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { actorName: regex },
        { action: regex },
        { resource: regex },
        { summary: regex },
        { resourceId: regex },
      ]
    }

    const [events, total, actions, resources] = await Promise.all([
      ActivityEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ActivityEvent.countDocuments(filter),
      ActivityEvent.distinct('action'),
      ActivityEvent.distinct('resource'),
    ])

    res.json({
      success: true,
      data: {
        events: events.map((e) => e.toPublicJSON()),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        filters: {
          actions: actions.sort(),
          resources: resources.sort(),
        },
      },
    })
  } catch (error) {
    logger.error('Erreur fil activité', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/**
 * SSE temps réel — activités unifiées.
 * Auth via requireAdminAuth (Bearer). EventSource custom fetch côté client.
 */
router.get('/stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ type: 'connected', at: new Date().toISOString() })}\n\n`)

    addActivityEventClient(res)
    req.on('close', () => removeActivityEventClient(res))
  } catch (error) {
    logger.error('Erreur stream activité', { error: error.message })
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Stream impossible' })
    }
  }
})

/** Stats rapides audit (complément cockpit). */
router.get('/audit-stats', async (_req, res) => {
  try {
    const today = startOfDay()
    const [todayCount, byAction] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
    ])
    res.json({
      success: true,
      data: {
        todayCount,
        byAction: byAction.map((row) => ({ action: row._id, count: row.count })),
      },
    })
  } catch (error) {
    logger.error('Erreur audit-stats', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
