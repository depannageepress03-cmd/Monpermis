import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { User } from '../models/User.js'
import { Chapter } from '../models/Chapter.js'
import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { Question } from '../models/Question.js'
import { Moniteur } from '../models/Moniteur.js'
import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { Admin } from '../models/Admin.js'
import { Payment } from '../models/Payment.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { addLocalDays, formatLocalDate } from '../utils/localDate.js'

const router = Router()
router.use(requireAdminAuth)

/** Agrégat léger : nombre de chapitres, publiés, et total de cours embarqués. */
const chapterStats = (Model) =>
  Model.aggregate([
    {
      $group: {
        _id: null,
        chapters: { $sum: 1 },
        published: { $sum: { $cond: [{ $eq: ['$published', true] }, 1, 0] } },
        courses: { $sum: { $size: { $ifNull: ['$courses', []] } } },
      },
    },
  ]).then((rows) => rows[0] || { chapters: 0, published: 0, courses: 0 })

router.get('/summary', async (_req, res) => {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Tout part en parallèle et en comptages côté base : on ne charge plus les collections entières.
    const [
      usersTotal,
      usersActive,
      codeStats,
      conduiteStats,
      questionsCount,
      moniteursTotal,
      moniteursActive,
      reservationsTotal,
      reservationsPending,
      reservationsConfirmed,
      creneauxLibre,
      adminsCount,
      revenueTotalAgg,
      revenueMonthAgg,
      accessActive,
      accessPending,
      accessExpired,
      paymentsPending,
      paymentsNeedsRefund,
      recentPayments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      chapterStats(Chapter),
      chapterStats(ConduiteChapter),
      Question.countDocuments(),
      Moniteur.countDocuments(),
      Moniteur.countDocuments({ active: { $ne: false } }),
      Reservation.countDocuments(),
      Reservation.countDocuments({
        $or: [{ paymentStatus: 'pending_validation' }, { status: 'pending_payment' }],
      }),
      Reservation.countDocuments({
        $or: [{ status: 'confirmed' }, { paymentStatus: 'paid' }],
      }),
      Creneau.countDocuments({ status: 'libre', date: { $gte: formatLocalDate() } }),
      Admin.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'approved', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AccessRequest.countDocuments({ status: 'actif' }),
      AccessRequest.countDocuments({
        status: { $in: ['en_attente', 'paiement_declare', 'en_verification'] },
      }),
      AccessRequest.countDocuments({ status: 'expire' }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ needsRefund: true }),
      Payment.find().sort({ updatedAt: -1 }).limit(20),
    ])

    const revenueTotal = revenueTotalAgg[0]?.total || 0
    const revenueTransactions = revenueTotalAgg[0]?.count || 0
    const revenueMonth = revenueMonthAgg[0]?.total || 0
    const usersSuspended = usersTotal - usersActive

    const userIds = [...new Set(recentPayments.map((p) => String(p.userId)))]
    const requestIds = [
      ...new Set(
        recentPayments.flatMap((p) => {
          const linked = typeof p.linkedRequestIds === 'function' ? p.linkedRequestIds() : []
          const ids = linked.length ? linked : p.accessRequestId ? [p.accessRequestId] : []
          return ids.map((id) => String(id)).filter(Boolean)
        }),
      ),
    ]
    const [learners, requests] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('firstName lastName email phone'),
      AccessRequest.find({ _id: { $in: requestIds } }).select('module status'),
    ])
    const learnerMap = new Map(learners.map((u) => [String(u._id), u]))
    const requestMap = new Map(requests.map((r) => [String(r._id), r]))

    res.json({
      success: true,
      data: {
        summary: {
          users: {
            total: usersTotal,
            active: usersActive,
            suspended: usersSuspended,
          },
          code: {
            chapters: codeStats.chapters,
            published: codeStats.published,
            courses: codeStats.courses,
            questions: questionsCount,
          },
          conduite: {
            chapters: conduiteStats.chapters,
            published: conduiteStats.published,
            courses: conduiteStats.courses,
            moniteurs: moniteursTotal,
            moniteursActive,
            creneauxLibre,
            reservations: reservationsTotal,
            reservationsPending,
            reservationsConfirmed,
          },
          admins: {
            total: adminsCount,
          },
          revenue: {
            currency: 'XOF',
            total: revenueTotal,
            month: revenueMonth,
            transactions: revenueTransactions,
          },
          accessRequests: {
            active: accessActive,
            pending: accessPending,
            expired: accessExpired,
          },
          payments: {
            pending: paymentsPending,
            needsRefund: paymentsNeedsRefund,
            recent: recentPayments.map((payment) => {
              const linkedIds =
                typeof payment.linkedRequestIds === 'function'
                  ? payment.linkedRequestIds()
                  : payment.accessRequestId
                    ? [payment.accessRequestId]
                    : []
              const linked = linkedIds.map((id) => requestMap.get(String(id))).filter(Boolean)
              const modules = linked.map((r) => r.module).filter(Boolean)
              const primary = requestMap.get(String(payment.accessRequestId)) || linked[0]
              return {
                ...payment.toAdminJSON(learnerMap.get(String(payment.userId))),
                module: primary?.module || modules[0] || null,
                modules,
                accessRequestStatus: primary?.status || null,
              }
            }),
          },
        },
      },
    })
  } catch (error) {
    console.error('Erreur résumé dashboard:', error)
    res.status(500).json({ success: false, error: 'Chargement du résumé impossible' })
  }
})

/** Fuseau d'exploitation (Bénin, UTC+1 sans changement d'heure). */
const REPORT_TZ = 'Africa/Porto-Novo'

const MODULE_LABELS = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  aiChat: 'Chat IA',
  reservation: 'Réservations',
  autre: 'Autres',
}

const pctChange = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null

/**
 * Chiffre d'affaires par jour / mois / année + répartition par offre,
 * pour le tableau de bord (cartes KPI, graphique d'évolution, anneau).
 * Seuls les paiements `approved` comptent comme chiffre d'affaires.
 */
router.get('/overview', async (req, res) => {
  try {
    const asked = String(req.query?.date || '')
    const today = formatLocalDate()
    const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today
    const year = date.slice(0, 4)
    const month = date.slice(0, 7)
    const previousYear = String(Number(year) - 1)

    // Deux ans d'historique glissant : de quoi comparer une année à la précédente.
    const from = addLocalDays(date, -730)
    const fromDate = new Date(`${from}T00:00:00+01:00`)
    const toDate = new Date(`${addLocalDays(date, 1)}T00:00:00+01:00`)

    const dailyRows = await Payment.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TZ } },
          ca: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    const daily = dailyRows.map((row) => ({ date: row._id, ca: row.ca, count: row.count }))
    const byDate = new Map(daily.map((row) => [row.date, row]))

    const sumWhere = (predicate, key = 'ca') =>
      daily.reduce((total, row) => (predicate(row.date) ? total + row[key] : total), 0)

    const dayOfMonth = date.slice(8, 10)
    const monthDay = date.slice(5)
    const previousMonth = (() => {
      const y = Number(year)
      const m = Number(date.slice(5, 7)) - 1
      return m ? `${year}-${String(m).padStart(2, '0')}` : `${y - 1}-12`
    })()

    const dayCa = byDate.get(date)?.ca || 0
    const dayCount = byDate.get(date)?.count || 0
    const monthCa = sumWhere((d) => d.slice(0, 7) === month)
    const monthCount = sumWhere((d) => d.slice(0, 7) === month, 'count')
    const yearCa = sumWhere((d) => d.slice(0, 4) === year)
    const yearCount = sumWhere((d) => d.slice(0, 4) === year, 'count')

    const previousDayCa = byDate.get(addLocalDays(date, -1))?.ca || 0
    const previousMonthCa = sumWhere(
      (d) => d.slice(0, 7) === previousMonth && d.slice(8, 10) <= dayOfMonth,
    )
    const previousYearCa = sumWhere(
      (d) => d.slice(0, 4) === previousYear && d.slice(5) <= monthDay,
    )

    const months = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(`${month}-15T12:00:00Z`)
      t.setUTCMonth(t.getUTCMonth() - (11 - i))
      return t.toISOString().slice(0, 7)
    })

    // Répartition du mois par offre : un panier est ventilé au prorata des montants de ses demandes.
    const monthStart = new Date(`${month}-01T00:00:00+01:00`)
    const monthEndDate = new Date(monthStart)
    monthEndDate.setMonth(monthEndDate.getMonth() + 1)
    const monthPayments = await Payment.find({
      status: 'approved',
      createdAt: { $gte: monthStart, $lt: monthEndDate < toDate ? monthEndDate : toDate },
    }).select('amount accessRequestId accessRequestIds reservationGroupId')

    const requestIds = [
      ...new Set(
        monthPayments.flatMap((p) =>
          [...(p.accessRequestIds || []), p.accessRequestId].filter(Boolean).map(String),
        ),
      ),
    ]
    const requests = requestIds.length
      ? await AccessRequest.find({ _id: { $in: requestIds } }).select('module amount')
      : []
    const requestMap = new Map(requests.map((r) => [String(r._id), r]))

    const byModuleTotals = new Map()
    const add = (key, value) => byModuleTotals.set(key, (byModuleTotals.get(key) || 0) + value)
    for (const payment of monthPayments) {
      const linked = [
        ...new Set(
          [...(payment.accessRequestIds || []), payment.accessRequestId]
            .filter(Boolean)
            .map(String),
        ),
      ]
        .map((id) => requestMap.get(id))
        .filter(Boolean)
      const weight = linked.reduce((total, r) => total + (r.amount || 0), 0)
      if (linked.length && weight > 0) {
        for (const request of linked) {
          add(request.module, payment.amount * ((request.amount || 0) / weight))
        }
      } else if (linked.length) {
        add(linked[0].module, payment.amount)
      } else {
        add(payment.reservationGroupId ? 'reservation' : 'autre', payment.amount)
      }
    }
    const byModule = [...byModuleTotals.entries()]
      .map(([key, ca]) => ({ key, label: MODULE_LABELS[key] || key, ca: Math.round(ca) }))
      .filter((row) => row.ca > 0)
      .sort((a, b) => b.ca - a.ca)

    res.json({
      success: true,
      data: {
        overview: {
          date,
          year,
          month,
          currency: 'XOF',
          kpi: {
            day: { ca: dayCa, count: dayCount, trend: pctChange(dayCa, previousDayCa) },
            month: { ca: monthCa, count: monthCount, trend: pctChange(monthCa, previousMonthCa) },
            year: { ca: yearCa, count: yearCount, trend: pctChange(yearCa, previousYearCa) },
          },
          spark: {
            day: Array.from({ length: 14 }, (_, i) => byDate.get(addLocalDays(date, i - 13))?.ca || 0),
            month: months.map((m) => sumWhere((d) => d.slice(0, 7) === m)),
            year: Array.from({ length: 5 }, (_, i) =>
              sumWhere((d) => d.slice(0, 4) === String(Number(year) - 4 + i)),
            ),
          },
          daily,
          byModule,
        },
      },
    })
  } catch (error) {
    console.error('Erreur vue d’ensemble dashboard:', error)
    res.status(500).json({ success: false, error: 'Chargement de la vue d’ensemble impossible' })
  }
})

export default router
