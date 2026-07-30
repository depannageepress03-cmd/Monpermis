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
import { formatLocalDate } from '../utils/localDate.js'

const router = Router()
router.use(requireAdminAuth)

router.get('/summary', async (_req, res) => {
  try {
    const [
      users,
      codeChapters,
      conduiteChapters,
      questionsCount,
      moniteurs,
      reservations,
      creneauxLibre,
      adminsCount,
    ] = await Promise.all([
      User.find().select('isActive'),
      Chapter.find().select('published courses'),
      ConduiteChapter.find().select('published courses'),
      Question.countDocuments(),
      Moniteur.find().select('active'),
      Reservation.find().select('status paymentStatus'),
      Creneau.countDocuments({ status: 'libre', date: { $gte: formatLocalDate() } }),
      Admin.countDocuments(),
    ])

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      revenueTotalAgg,
      revenueMonthAgg,
      accessActive,
      accessPending,
      accessExpired,
      paymentsPending,
      paymentsNeedsRefund,
      recentPayments,
    ] = await Promise.all([
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

    const usersTotal = users.length
    const usersActive = users.filter((item) => item.isActive !== false).length
    const usersSuspended = usersTotal - usersActive

    const codeCourses = codeChapters.reduce(
      (sum, chapter) => sum + (chapter.courses?.length || 0),
      0,
    )
    const codePublished = codeChapters.filter((chapter) => chapter.published).length

    const conduiteCourses = conduiteChapters.reduce(
      (sum, chapter) => sum + (chapter.courses?.length || 0),
      0,
    )
    const conduitePublished = conduiteChapters.filter((chapter) => chapter.published).length

    const moniteursActive = moniteurs.filter((item) => item.active !== false).length

    const reservationsPending = reservations.filter(
      (item) =>
        item.paymentStatus === 'pending_validation' || item.status === 'pending_payment',
    ).length
    const reservationsConfirmed = reservations.filter(
      (item) => item.status === 'confirmed' || item.paymentStatus === 'paid',
    ).length

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
            chapters: codeChapters.length,
            published: codePublished,
            courses: codeCourses,
            questions: questionsCount,
          },
          conduite: {
            chapters: conduiteChapters.length,
            published: conduitePublished,
            courses: conduiteCourses,
            moniteurs: moniteurs.length,
            moniteursActive,
            creneauxLibre,
            reservations: reservations.length,
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

export default router
