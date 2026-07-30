import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { Payment } from '../models/Payment.js'
import { PaymentLedgerEntry } from '../models/PaymentLedgerEntry.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { Admin } from '../models/Admin.js'
import { PromoCodeRedemption } from '../models/PromoCodeRedemption.js'
import { PromoCode } from '../models/PromoCode.js'
import {
  computeFinanceStatus,
  paymentKind,
  recordPaymentLedgerEvent,
  synthesizeTimelineFromPayment,
} from '../utils/paymentLedger.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth, requireSuperAdmin)

const FINANCE_STATUSES = [
  'pending',
  'approved',
  'failed',
  'declined',
  'canceled',
  'needsRefund',
  'refunded',
]

function startOfToday(now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(now = new Date()) {
  const d = startOfToday(now)
  const day = d.getDay()
  // Lundi = début de semaine
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth(now = new Date()) {
  const d = startOfToday(now)
  d.setDate(1)
  return d
}

function csvEscape(value) {
  const raw = value == null ? '' : String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

async function buildLedgerFilter(query) {
  const filter = {}
  const and = []

  const status = String(query.status || '').trim()
  if (status === 'needsRefund') {
    filter.needsRefund = true
  } else if (status === 'refunded') {
    and.push({
      $or: [
        { refundResolvedAt: { $ne: null } },
        {
          needsRefund: false,
          adminNote: { $regex: '\\[Remboursement\\]', $options: 'i' },
          status: 'approved',
        },
      ],
    })
  } else if (FINANCE_STATUSES.includes(status) && status !== 'needsRefund' && status !== 'refunded') {
    filter.status = status
    if (status === 'approved') {
      filter.needsRefund = { $ne: true }
      and.push({
        $or: [{ refundResolvedAt: null }, { refundResolvedAt: { $exists: false } }],
      })
    }
  }

  const kind = String(query.kind || '').trim()
  if (kind === 'reservation') {
    filter.reservationGroupId = { $ne: null }
  } else if (kind === 'abonnement') {
    filter.reservationGroupId = null
    and.push({
      $or: [
        { accessRequestId: { $ne: null } },
        { 'accessRequestIds.0': { $exists: true } },
      ],
    })
  }

  const operator = String(query.operator || '').trim().toLowerCase()
  if (['mtn', 'moov', 'celtiis'].includes(operator)) {
    filter.paymentMethod = operator
  }

  if (query.from || query.to) {
    filter.createdAt = {}
    if (query.from) filter.createdAt.$gte = new Date(query.from)
    if (query.to) {
      const to = new Date(query.to)
      if (!Number.isNaN(to.getTime()) && String(query.to).length <= 10) {
        to.setHours(23, 59, 59, 999)
      }
      filter.createdAt.$lte = to
    }
  }

  const q = String(query.q || '').trim()
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const matchedUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
    })
      .select('_id')
      .limit(300)
    const userIds = matchedUsers.map((u) => u._id)
    and.push({
      $or: [
        { userId: { $in: userIds } },
        { fedapayReference: regex },
        { fedapayTransactionId: regex },
        { declaredReference: regex },
        ...(mongoose.isValidObjectId(q) ? [{ _id: q }] : []),
      ],
    })
  }

  if (and.length) filter.$and = and
  return filter
}

async function enrichPayments(payments) {
  const userIds = [...new Set(payments.map((p) => String(p.userId)).filter(Boolean))]
  const verifierIds = [
    ...new Set(payments.map((p) => (p.verifiedByAdminId ? String(p.verifiedByAdminId) : null)).filter(Boolean)),
  ]
  const linkedIds = [
    ...new Set(
      payments.flatMap((p) => (p.linkedRequestIds?.() || []).map((id) => String(id))).filter(Boolean),
    ),
  ]
  const groupIds = [
    ...new Set(payments.map((p) => (p.reservationGroupId ? String(p.reservationGroupId) : null)).filter(Boolean)),
  ]

  const [users, verifiers, requests, reservations] = await Promise.all([
    userIds.length
      ? User.find({ _id: { $in: userIds } }).select('firstName lastName email phone soldeHeures')
      : [],
    verifierIds.length ? Admin.find({ _id: { $in: verifierIds } }).select('fullName') : [],
    linkedIds.length
      ? AccessRequest.find({ _id: { $in: linkedIds } }).select(
          'module quantity unit status amount currency',
        )
      : [],
    groupIds.length
      ? Reservation.find({ bookingGroupId: { $in: groupIds } }).select(
          'bookingGroupId status paymentStatus priceFcfa startAt endAt moniteurId',
        )
      : [],
  ])

  const userMap = new Map(users.map((u) => [String(u._id), u]))
  const verifierMap = new Map(verifiers.map((a) => [String(a._id), a]))
  const requestMap = new Map(requests.map((r) => [String(r._id), r]))
  const reservationsByGroup = new Map()
  for (const r of reservations) {
    const key = String(r.bookingGroupId)
    if (!reservationsByGroup.has(key)) reservationsByGroup.set(key, [])
    reservationsByGroup.get(key).push(r)
  }

  return payments.map((p) => {
    const ids = (p.linkedRequestIds?.() || []).map((id) => String(id))
    const modules = ids.map((id) => requestMap.get(id)?.module).filter(Boolean)
    const kind = paymentKind(p)
    const groupKey = p.reservationGroupId ? String(p.reservationGroupId) : null
    return {
      ...p.toAdminJSON(userMap.get(String(p.userId)), verifierMap.get(String(p.verifiedByAdminId || ''))),
      financeStatus: computeFinanceStatus(p),
      kind,
      modules,
      module: modules[0] || null,
      accessRequests: ids.map((id) => {
        const r = requestMap.get(id)
        return r
          ? {
              id: String(r._id),
              module: r.module,
              quantity: r.quantity,
              unit: r.unit,
              status: r.status,
              amount: r.amount,
              currency: r.currency || 'XOF',
            }
          : { id }
      }),
      reservations: groupKey
        ? (reservationsByGroup.get(groupKey) || []).map((r) => ({
            id: String(r._id),
            status: r.status,
            paymentStatus: r.paymentStatus,
            priceFcfa: r.priceFcfa,
            startAt: r.startAt,
            endAt: r.endAt,
          }))
        : [],
    }
  })
}

async function sumAmount(match) {
  const rows = await Payment.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  return {
    total: rows[0]?.total || 0,
    count: rows[0]?.count || 0,
  }
}

async function periodBucket(from, to) {
  const range = { $gte: from, ...(to ? { $lte: to } : {}) }
  const [encaisse, enAttente, aRembourser, rembourse] = await Promise.all([
    sumAmount({
      status: 'approved',
      needsRefund: { $ne: true },
      activatedAt: range,
      $or: [{ refundResolvedAt: null }, { refundResolvedAt: { $exists: false } }],
    }),
    sumAmount({ status: 'pending', createdAt: range }),
    sumAmount({ needsRefund: true, updatedAt: range }),
    sumAmount({ refundResolvedAt: range }),
  ])

  // File actuelle à rembourser (stock, pas flux période) — utile pour KPI ops
  const outstanding = await sumAmount({ needsRefund: true })

  return {
    from: from.toISOString(),
    to: (to || new Date()).toISOString(),
    encaisse,
    enAttente,
    aRembourser,
    rembourse,
    outstandingRefunds: outstanding,
  }
}

/** KPIs jour / semaine / mois. */
router.get('/summary', async (_req, res) => {
  try {
    const now = new Date()
    const [today, week, month, outstanding] = await Promise.all([
      periodBucket(startOfToday(now), now),
      periodBucket(startOfWeek(now), now),
      periodBucket(startOfMonth(now), now),
      sumAmount({ needsRefund: true }),
    ])

    res.json({
      success: true,
      data: {
        today,
        week,
        month,
        outstandingRefunds: outstanding,
        currency: 'XOF',
      },
    })
  } catch (error) {
    logger.error('Erreur résumé finances', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Grand livre — tous les paiements filtrables. */
router.get('/ledger', async (req, res) => {
  try {
    const filter = await buildLedgerFilter(req.query)
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40))
    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        payments: await enrichPayments(payments),
      },
    })
  } catch (error) {
    logger.error('Erreur ledger finances', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Export CSV du ledger (mêmes filtres, max 5000 lignes). */
router.get('/export.csv', async (req, res) => {
  try {
    const filter = await buildLedgerFilter(req.query)
    const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(5000)
    const rows = await enrichPayments(payments)

    const header = [
      'id',
      'date',
      'statut',
      'type',
      'montant',
      'devise',
      'operateur',
      'telephone',
      'apprenant',
      'reference_fedapay',
      'transaction_fedapay',
      'modules',
      'needs_refund',
      'rembourse_le',
      'note_admin',
    ]

    const lines = [header.join(',')]
    for (const p of rows) {
      lines.push(
        [
          csvEscape(p.id),
          csvEscape(p.createdAt),
          csvEscape(p.financeStatus),
          csvEscape(p.kind),
          csvEscape(p.amount),
          csvEscape(p.currency),
          csvEscape(p.paymentMethod || p.method),
          csvEscape(p.learner?.phone || ''),
          csvEscape(
            p.learner ? `${p.learner.firstName || ''} ${p.learner.lastName || ''}`.trim() : '',
          ),
          csvEscape(p.fedapayReference || ''),
          csvEscape(p.fedapayTransactionId || ''),
          csvEscape((p.modules || []).join('|')),
          csvEscape(p.needsRefund ? '1' : '0'),
          csvEscape(p.refundResolvedAt || ''),
          csvEscape(p.adminNote || ''),
        ].join(','),
      )
    }

    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="tresorerie-${stamp}.csv"`)
    res.send(`\uFEFF${lines.join('\n')}`)
  } catch (error) {
    logger.error('Erreur export finances', { error: error.message })
    res.status(500).json({ success: false, error: 'Export impossible' })
  }
})

/** Détail d’un paiement : timeline ledger + liens + promo éventuels. */
router.get('/payments/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Identifiant invalide' })
    }

    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    }

    const [enriched] = await enrichPayments([payment])
    const ledgerEntries = await PaymentLedgerEntry.find({ paymentId: payment._id }).sort({
      createdAt: 1,
    })

    let timeline =
      ledgerEntries.length > 0
        ? ledgerEntries.map((e) => e.toPublicJSON())
        : synthesizeTimelineFromPayment(payment)

    // Promo / solde : redemptions proches de la création du paiement (même apprenant, ±2h)
    const windowStart = new Date(new Date(payment.createdAt).getTime() - 2 * 60 * 60 * 1000)
    const windowEnd = new Date(new Date(payment.createdAt).getTime() + 2 * 60 * 60 * 1000)
    const redemptions = await PromoCodeRedemption.find({
      userId: payment.userId,
      $or: [
        { redeemedAt: { $gte: windowStart, $lte: windowEnd } },
        { createdAt: { $gte: windowStart, $lte: windowEnd } },
      ],
    }).limit(10)
    const promoIds = redemptions.map((r) => r.promoCodeId)
    const promos = promoIds.length
      ? await PromoCode.find({ _id: { $in: promoIds } }).select('code label modules heuresBonus')
      : []
    const promoMap = new Map(promos.map((p) => [String(p._id), p]))

    const user = await User.findById(payment.userId).select(
      'firstName lastName email phone soldeHeures',
    )

    res.json({
      success: true,
      data: {
        payment: enriched,
        timeline,
        relatedPromos: redemptions.map((r) => {
          const promo = promoMap.get(String(r.promoCodeId))
          return {
            redemptionId: String(r._id),
            redeemedAt: r.redeemedAt || r.createdAt,
            code: promo?.code || '',
            label: promo?.label || '',
            modules: promo?.modules || [],
            heuresBonus: promo?.heuresBonus ?? null,
          }
        }),
        learnerSoldeHeures: user?.soldeHeures ?? null,
        rawLastEvent: payment.rawLastEvent || null,
      },
    })
  } catch (error) {
    logger.error('Erreur détail finances', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Résolution remboursement (même logique que Abonnements — hub trésorerie). */
router.patch(
  '/payments/:id/resolve-refund',
  audit('resolve_refund', 'payment'),
  async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id)
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Paiement introuvable' })
      }
      if (!payment.needsRefund) {
        return res
          .status(400)
          .json({ success: false, error: 'Ce paiement n’est pas signalé pour remboursement' })
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
        metadata: { manualRefund: true, via: 'finances' },
      })

      const [enriched] = await enrichPayments([payment])
      res.json({ success: true, data: { payment: enriched } })
    } catch (error) {
      logger.error('Erreur résolution remboursement (finances)', { error: error.message })
      res.status(500).json({ success: false, error: 'Mise à jour impossible' })
    }
  },
)

export default router
