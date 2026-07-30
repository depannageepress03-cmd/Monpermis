import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessRequest, ACCESS_REQUEST_STATUSES } from '../models/AccessRequest.js'
import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { Admin } from '../models/Admin.js'
import {
  adminGrantModuleAccess,
  adminValidateAccessRequest,
  expireDueAccessRequests,
  remainingForAccessRequest,
} from '../utils/accessRequests.js'
import { recordPaymentLedgerEvent } from '../utils/paymentLedger.js'
import { addPaymentEventClient, removePaymentEventClient } from '../services/paymentEvents.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

function durationLabel(quantity, unit) {
  const qty = Math.max(1, Number(quantity) || 1)
  if (unit === 'hour') return `${qty} heure${qty > 1 ? 's' : ''}`
  if (unit === 'day') return `${qty} jour${qty > 1 ? 's' : ''}`
  if (unit === 'week') return `${qty} semaine${qty > 1 ? 's' : ''}`
  if (unit === 'month') return `${qty} mois`
  return 'Accès unique'
}

/** Flux SSE temps réel (abonnements / paiements). */
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

/** Liste des abonnements actifs (type + durée restante). */
router.get('/subscribers', async (req, res) => {
  try {
    await expireDueAccessRequests()

    const filter = {
      $or: [{ status: 'actif' }, { status: 'valide', module: 'conduite_heures' }],
    }
    if (ACCESS_MODULES.includes(req.query.module)) filter.module = req.query.module

    const q = String(req.query.q || '').trim()
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const matchedUsers = await User.find({
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
      })
        .select('_id')
        .limit(200)
      filter.userId = { $in: matchedUsers.map((u) => u._id) }
    }

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40))
    const skip = (page - 1) * limit

    const [requests, total] = await Promise.all([
      AccessRequest.find(filter).sort({ endAt: 1, updatedAt: -1 }).skip(skip).limit(limit),
      AccessRequest.countDocuments(filter),
    ])

    const userIds = [...new Set(requests.map((r) => String(r.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select(
      'firstName lastName email phone soldeHeures',
    )
    const userMap = new Map(users.map((u) => [String(u._id), u]))
    const now = new Date()

    res.json({
      success: true,
      data: {
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        subscribers: requests.map((r) => {
          const learner = userMap.get(String(r.userId))
          const remaining = remainingForAccessRequest(r, now)
          const granted = Number(r.amount) === 0
          return {
            ...r.toAdminJSON(learner),
            durationLabel: durationLabel(r.quantity, r.unit),
            remainingMs: remaining.remainingMs,
            remainingLabel:
              r.module === 'conduite_heures'
                ? `${learner?.soldeHeures ?? 0} h restantes (solde)`
                : remaining.remainingLabel,
            source: granted ? 'admin' : 'payment',
            soldeHeures: learner?.soldeHeures ?? null,
          }
        }),
      },
    })
  } catch (error) {
    logger.error('Erreur liste abonnés:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Attribution manuelle exceptionnelle d’un abonnement. */
router.post('/grant', audit('grant', 'access'), async (req, res) => {
  try {
    const { userId, module, quantity, note } = req.body ?? {}
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Apprenant requis' })
    }
    const request = await adminGrantModuleAccess({
      userId,
      module,
      quantity,
      note,
      admin: req.admin,
    })
    const user = await User.findById(request.userId).select('firstName lastName email phone soldeHeures')
    const remaining = remainingForAccessRequest(request)
    res.status(201).json({
      success: true,
      data: {
        subscriber: {
          ...request.toAdminJSON(user),
          durationLabel: durationLabel(request.quantity, request.unit),
          remainingMs: remaining.remainingMs,
          remainingLabel:
            request.module === 'conduite_heures'
              ? `${user?.soldeHeures ?? 0} h restantes (solde)`
              : remaining.remainingLabel,
          source: 'admin',
          soldeHeures: user?.soldeHeures ?? null,
        },
      },
    })
  } catch (error) {
    logger.error('Erreur attribution abonnement:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Attribution impossible',
    })
  }
})

/** Flux des paiements réussis (Mobile Money). */
router.get('/payments', async (req, res) => {
  try {
    const needsRefundOnly =
      req.query.needsRefund === '1' ||
      req.query.needsRefund === 'true' ||
      req.query.needsRefund === 'yes'

    const filter = needsRefundOnly ? { needsRefund: true } : { status: 'approved' }
    if (!needsRefundOnly && (req.query.from || req.query.to)) {
      filter.activatedAt = {}
      if (req.query.from) filter.activatedAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.activatedAt.$lte = new Date(req.query.to)
    }

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40))
    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort(needsRefundOnly ? { updatedAt: -1, createdAt: -1 } : { activatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ])

    const userIds = [...new Set(payments.map((p) => String(p.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email phone')
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    const linkedIds = [
      ...new Set(
        payments.flatMap((p) => (p.linkedRequestIds?.() || []).map((id) => String(id))).filter(Boolean),
      ),
    ]
    const linkedRequests = linkedIds.length
      ? await AccessRequest.find({ _id: { $in: linkedIds } }).select('module quantity unit status')
      : []
    const requestMap = new Map(linkedRequests.map((r) => [String(r._id), r]))

    res.json({
      success: true,
      data: {
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        payments: payments.map((p) => {
          const ids = (p.linkedRequestIds?.() || []).map((id) => String(id))
          const modules = ids.map((id) => requestMap.get(id)?.module).filter(Boolean)
          return {
            ...p.toAdminJSON(userMap.get(String(p.userId))),
            modules,
            module: modules[0] || null,
            kind: p.reservationGroupId ? 'reservation' : ids.length ? 'abonnement' : 'autre',
          }
        }),
      },
    })
  } catch (error) {
    logger.error('Erreur liste paiements réussis:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Marque un paiement needsRefund comme traité (remboursement manuel hors plateforme). */
router.patch('/payments/:id/resolve-refund', audit('resolve_refund', 'payment'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    }
    if (!payment.needsRefund) {
      return res.status(400).json({ success: false, error: 'Ce paiement n’est pas signalé pour remboursement' })
    }

    const note = String(req.body?.note || '').trim()
    if (!note) {
      return res.status(400).json({ success: false, error: 'Une note est obligatoire' })
    }

    payment.needsRefund = false
    payment.adminNote = payment.adminNote
      ? `${payment.adminNote}\n[Remboursement] ${note}`
      : `[Remboursement] ${note}`
    payment.verifiedByAdminId = req.admin._id
    payment.verifiedAt = new Date()
    payment.refundResolvedAt = new Date()
    await payment.save()

    void recordPaymentLedgerEvent(payment, {
      eventType: 'refund_resolved',
      fromStatus: payment.status,
      toStatus: payment.status,
      actor: 'admin',
      actorLabel: req.admin.fullName || 'Admin',
      adminId: req.admin._id,
      note,
      needsRefund: false,
      idempotencyKey: `refund_resolved:${String(payment._id)}:${payment.refundResolvedAt.toISOString()}`,
      metadata: { manualRefund: true },
    })

    const user = await User.findById(payment.userId).select('firstName lastName email phone')
    res.json({
      success: true,
      data: { payment: payment.toAdminJSON(user, req.admin) },
    })
  } catch (error) {
    logger.error('Erreur résolution remboursement:', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
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

router.patch('/modules/:key', audit('update', 'pricing'), async (req, res) => {
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
    if (req.body.unit !== undefined) {
      const unit = String(req.body.unit)
      if (!['flat', 'month', 'hour', 'week'].includes(unit)) {
        return res.status(400).json({ success: false, error: 'Unité invalide' })
      }
      pricing.unit = unit
    }
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

router.post('/:id/validate', audit('validate', 'access_request'), async (req, res) => {
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
