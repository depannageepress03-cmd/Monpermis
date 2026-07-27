import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessRequest, ACCESS_REQUEST_STATUSES } from '../models/AccessRequest.js'
import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { Admin } from '../models/Admin.js'
import { adminValidateAccessRequest } from '../utils/accessRequests.js'
import { addPaymentEventClient, removePaymentEventClient } from '../services/paymentEvents.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

/** Flux SSE temps réel (demandes d’accès / paiements). */
router.get('/payments/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 3000\n\n')
  res.write(': connected\n\n')

  addPaymentEventClient(res)

  req.on('close', () => {
    removePaymentEventClient(res)
  })
})

router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (ACCESS_REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status
    if (ACCESS_MODULES.includes(req.query.module)) filter.module = req.query.module
    if (req.query.userId) filter.userId = req.query.userId
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to)
    }

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30))
    const skip = (page - 1) * limit

    const [requests, total] = await Promise.all([
      AccessRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessRequest.countDocuments(filter),
    ])

    const userIds = [...new Set(requests.map((r) => String(r.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email phone')
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    res.json({
      success: true,
      data: {
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        accessRequests: requests.map((r) => r.toAdminJSON(userMap.get(String(r.userId)))),
      },
    })
  } catch (error) {
    logger.error('Erreur liste demandes d’accès:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

// Routes littérales AVANT /:id pour éviter qu'Express ne les fasse matcher comme un id.
router.get('/modules', async (_req, res) => {
  try {
    const modules = await AccessModulePricing.find().sort({ key: 1 })
    res.json({ success: true, data: { modules: modules.map((m) => m.toAdminJSON()) } })
  } catch (error) {
    logger.error('Erreur config tarifs:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/modules/:key', async (req, res) => {
  try {
    if (!ACCESS_MODULES.includes(req.params.key)) {
      return res.status(404).json({ success: false, error: 'Module inconnu' })
    }
    const pricing = await AccessModulePricing.findOne({ key: req.params.key })
    if (!pricing) {
      return res.status(404).json({ success: false, error: 'Module non configuré' })
    }
    if (req.body.price !== undefined) {
      const price = Number(req.body.price)
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, error: 'Prix invalide' })
      }
      pricing.price = price
    }
    if (req.body.active !== undefined) pricing.active = Boolean(req.body.active)
    if (req.body.label !== undefined) pricing.label = String(req.body.label).trim() || pricing.label
    await pricing.save()

    res.json({ success: true, data: { module: pricing.toAdminJSON() } })
  } catch (error) {
    logger.error('Erreur mise à jour tarif:', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.get('/stats', async (_req, res) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [byModuleRevenue, byStatus, byMethod, pendingOver24h] = await Promise.all([
      AccessRequest.aggregate([
        { $match: { status: { $in: ['valide', 'actif', 'expire'] } } },
        { $group: { _id: '$module', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      AccessRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      AccessRequest.countDocuments({
        status: { $in: ['en_attente', 'paiement_declare', 'en_verification'] },
        createdAt: { $lt: dayAgo },
      }),
    ])

    res.json({
      success: true,
      data: {
        revenueByModule: byModuleRevenue.map((row) => ({
          module: row._id,
          total: row.total,
          count: row.count,
        })),
        countByStatus: byStatus.map((row) => ({ status: row._id, count: row.count })),
        revenueByMethod: byMethod.map((row) => ({ method: row._id, total: row.total, count: row.count })),
        pendingOver24h,
      },
    })
  } catch (error) {
    logger.error('Erreur statistiques accès:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' })
    }

    const [user, audit, payments] = await Promise.all([
      User.findById(request.userId).select('firstName lastName email phone'),
      AccessAuditLog.find({ accessRequestId: request._id }).sort({ createdAt: 1 }),
      Payment.find({ accessRequestId: request._id }).sort({ createdAt: -1 }),
    ])

    const verifierIds = [...new Set(payments.map((p) => p.verifiedByAdminId).filter(Boolean).map(String))]
    const verifiers = verifierIds.length
      ? await Admin.find({ _id: { $in: verifierIds } }).select('fullName')
      : []
    const verifierMap = new Map(verifiers.map((a) => [String(a._id), a]))

    res.json({
      success: true,
      data: {
        accessRequest: request.toAdminJSON(user),
        audit: audit.map((a) => a.toPublicJSON()),
        payments: payments.map((p) => p.toAdminJSON(user, verifierMap.get(String(p.verifiedByAdminId)))),
      },
    })
  } catch (error) {
    logger.error('Erreur détail demande d’accès:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/:id/validate', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' })
    }
    const payment = await Payment.findOne({ accessRequestId: request._id }).sort({ createdAt: -1 })

    const { decision, note } = req.body ?? {}
    const updated = await adminValidateAccessRequest(request, payment, { decision, note, admin: req.admin })

    const user = await User.findById(updated.userId).select('firstName lastName email phone')
    res.json({ success: true, data: { accessRequest: updated.toAdminJSON(user) } })
  } catch (error) {
    logger.error('Erreur validation demande d’accès:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Validation impossible',
    })
  }
})

export default router
