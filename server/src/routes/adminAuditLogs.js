import { Router } from 'express'
import mongoose from 'mongoose'
import { AuditLog } from '../models/AuditLog.js'
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth, requireSuperAdmin)

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const filter = {}
    const adminId = String(req.query.adminId || '').trim()
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.adminId = adminId
    }

    const action = String(req.query.action || '').trim()
    if (action) filter.action = action

    const resource = String(req.query.resource || '').trim()
    if (resource) filter.resource = resource

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
          // Inclure toute la journée si date seule (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            d.setHours(23, 59, 59, 999)
          }
          filter.createdAt.$lte = d
        }
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt
    }

    const q = String(req.query.q || '').trim()
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { adminName: regex },
        { action: regex },
        { resource: regex },
        { resourceId: regex },
      ]
    }

    const [logs, total, actions, resources] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
      AuditLog.distinct('action'),
      AuditLog.distinct('resource'),
    ])

    res.json({
      success: true,
      data: {
        logs: logs.map((log) => log.toPublicJSON()),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        filters: {
          actions: actions.sort(),
          resources: resources.sort(),
        },
      },
    })
  } catch (error) {
    logger.error('Erreur journal audit', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
