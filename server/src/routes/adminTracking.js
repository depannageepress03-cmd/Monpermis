import { Router } from 'express'
import mongoose from 'mongoose'
import { LearnerTrackEvent, LEARNER_TRACK_EVENTS } from '../models/LearnerTrackEvent.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

const EXAM_EVENTS = ['exam_start', 'exam_answer', 'exam_skip', 'exam_quit', 'exam_complete']

function toObjectId(value) {
  if (!value) return null
  const v = String(value).trim()
  return mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null
}

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** KPIs du traçage : aujourd'hui + 30 jours. */
router.get('/stats', async (_req, res) => {
  try {
    const today = startOfDay()
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [eventsToday, activeLearnersToday, attemptAggToday, attemptAggMonth] = await Promise.all([
      LearnerTrackEvent.countDocuments({ createdAt: { $gte: today } }),
      LearnerTrackEvent.distinct('userId', { createdAt: { $gte: today } }),
      LearnerTrackEvent.aggregate([
        {
          $match: {
            event: { $in: ['exam_start', 'exam_complete'] },
            'context.attemptId': { $ne: null },
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: '$context.attemptId',
            startAt: { $min: '$createdAt' },
            completeAt: { $max: '$createdAt' },
            started: { $max: { $cond: [{ $eq: ['$event', 'exam_start'] }, 1, 0] } },
            completed: { $max: { $cond: [{ $eq: ['$event', 'exam_complete'] }, 1, 0] } },
            passed: { $max: { $cond: [{ $eq: ['$event', 'exam_complete'] }, { $ifNull: ['$payload.passed', false] }, false] } },
          },
        },
      ]),
      LearnerTrackEvent.aggregate([
        {
          $match: {
            event: { $in: ['exam_start', 'exam_complete'] },
            'context.attemptId': { $ne: null },
            createdAt: { $gte: monthAgo },
          },
        },
        {
          $group: {
            _id: '$context.attemptId',
            startAt: { $min: '$createdAt' },
            completeAt: { $max: '$createdAt' },
            started: { $max: { $cond: [{ $eq: ['$event', 'exam_start'] }, 1, 0] } },
            completed: { $max: { $cond: [{ $eq: ['$event', 'exam_complete'] }, 1, 0] } },
            passed: { $max: { $cond: [{ $eq: ['$event', 'exam_complete'] }, { $ifNull: ['$payload.passed', false] }, false] } },
          },
        },
      ]),
    ])

    const summarize = (agg) => {
      const finished = agg.filter((a) => a.started === 1 && a.completed === 1)
      const durations = finished.map((a) => (new Date(a.completeAt) - new Date(a.startAt)) / 1000)
      return {
        started: agg.filter((a) => a.started === 1).length,
        completed: finished.length,
        passed: finished.filter((a) => a.passed).length,
        passRate: finished.length ? Math.round((finished.filter((a) => a.passed).length / finished.length) * 100) : null,
        avgDurationSeconds: durations.length
          ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
          : null,
      }
    }

    res.json({
      success: true,
      data: {
        today: {
          events: eventsToday,
          activeLearners: activeLearnersToday.length,
          exams: summarize(attemptAggToday),
        },
        last30Days: summarize(attemptAggMonth),
      },
    })
  } catch (error) {
    logger.error('Erreur stats traçage', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Apprenants actifs sur l'APK (avec dernière activité + volume d'événements). */
router.get('/learners', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit
    const q = String(req.query.q || '').trim()

    const match = {}
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i')
      match.$or = [
        { 'user.firstName': regex },
        { 'user.lastName': regex },
        { 'user.phone': regex },
        { 'user.email': regex },
      ]
    }

    const pipeline = [
      { $group: { _id: '$userId', lastActivity: { $max: '$createdAt' }, events: { $sum: 1 } } },
      { $sort: { lastActivity: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                userId: '$_id',
                firstName: { $ifNull: ['$user.firstName', ''] },
                lastName: { $ifNull: ['$user.lastName', ''] },
                phone: { $ifNull: ['$user.phone', ''] },
                email: { $ifNull: ['$user.email', ''] },
                lastActivity: 1,
                events: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await LearnerTrackEvent.aggregate(pipeline)
    const rows = result?.data || []
    const total = result?.total?.[0]?.count || 0

    res.json({
      success: true,
      data: {
        learners: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    logger.error('Erreur liste apprenants traçage', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Sessions d'examens reconstruites à partir des événements (groupées par tentative). */
router.get('/exams', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit
    const userId = String(req.query.userId || '').trim()
    const examNumber = String(req.query.examNumber || '').trim()
    const from = parseDate(req.query.from)
    const to = parseDate(req.query.to)

    const match = {
      event: { $in: EXAM_EVENTS },
      'context.attemptId': { $ne: null },
    }
    const userIdOid = toObjectId(userId)
    if (userIdOid) match.userId = userIdOid
    if (examNumber) match['context.examNumber'] = Number(examNumber)
    if (from || to) {
      match.createdAt = {}
      if (from) match.createdAt.$gte = from
      if (to) match.createdAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$context.attemptId',
          userId: { $first: '$userId' },
          examType: { $first: { $ifNull: ['$context.examType', 'practice'] } },
          examNumber: { $first: { $ifNull: ['$context.examNumber', null] } },
          examId: { $first: { $ifNull: ['$context.examId', null] } },
          startAt: { $min: '$createdAt' },
          lastAt: { $max: '$createdAt' },
          answers: { $sum: { $cond: [{ $eq: ['$event', 'exam_answer'] }, 1, 0] } },
          skips: { $sum: { $cond: [{ $eq: ['$event', 'exam_skip'] }, 1, 0] } },
          quits: { $sum: { $cond: [{ $eq: ['$event', 'exam_quit'] }, 1, 0] } },
          completed: { $max: { $cond: [{ $eq: ['$event', 'exam_complete'] }, 1, 0] } },
          correct: {
            $max: {
              $cond: [{ $eq: ['$event', 'exam_complete'] }, { $ifNull: ['$payload.correct', null] }, null],
            },
          },
          total: {
            $max: {
              $cond: [{ $eq: ['$event', 'exam_complete'] }, { $ifNull: ['$payload.total', null] }, null],
            },
          },
          passed: {
            $max: {
              $cond: [{ $eq: ['$event', 'exam_complete'] }, { $ifNull: ['$payload.passed', null] }, null],
            },
          },
          sessionIds: { $addToSet: { $ifNull: ['$sessionId', ''] } },
        },
      },
      {
        $addFields: {
          durationSeconds: {
            $cond: [{ $gt: ['$lastAt', '$startAt'] }, { $divide: [{ $subtract: ['$lastAt', '$startAt'] }, 1000] }, 0],
          },
        },
      },
      { $sort: { startAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] },
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                attemptId: '$_id',
                userId: 1,
                firstName: { $ifNull: ['$user.firstName', ''] },
                lastName: { $ifNull: ['$user.lastName', ''] },
                phone: { $ifNull: ['$user.phone', ''] },
                examType: 1,
                examNumber: 1,
                startAt: 1,
                lastAt: 1,
                durationSeconds: 1,
                answers: 1,
                skips: 1,
                quits: 1,
                completed: 1,
                correct: 1,
                total: 1,
                passed: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await LearnerTrackEvent.aggregate(pipeline)
    const rows = result?.data || []
    const total = result?.total?.[0]?.count || 0

    res.json({
      success: true,
      data: {
        exams: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    logger.error('Erreur sessions examens traçage', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Chronologie détaillée d'une tentative d'examen. */
router.get('/exams/:attemptId', async (req, res) => {
  try {
    const attemptId = String(req.params.attemptId || '').trim()
    if (!attemptId) {
      return res.status(400).json({ success: false, error: 'Identifiant manquant' })
    }
    const events = await LearnerTrackEvent.find({ 'context.attemptId': attemptId })
      .sort({ createdAt: 1, _id: 1 })
      .limit(500)
    res.json({
      success: true,
      data: {
        attemptId,
        events: events.map((e) => e.toAdminJSON()),
      },
    })
  } catch (error) {
    logger.error('Erreur chronologie tentative', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Fil d'événements brut, paginé et filtrable. */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit
    const userId = String(req.query.userId || '').trim()
    const event = String(req.query.event || '').trim()
    const examNumber = String(req.query.examNumber || '').trim()
    const attemptId = String(req.query.attemptId || '').trim()
    const from = parseDate(req.query.from)
    const to = parseDate(req.query.to)

    const filter = {}
    if (userId) filter.userId = userId
    if (event && LEARNER_TRACK_EVENTS.includes(event)) filter.event = event
    if (examNumber) filter['context.examNumber'] = Number(examNumber)
    if (attemptId) filter['context.attemptId'] = attemptId
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = from
      if (to) filter.createdAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)
    }

    const [events, total] = await Promise.all([
      LearnerTrackEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LearnerTrackEvent.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        events: events.map((e) => e.toAdminJSON()),
        filters: { events: LEARNER_TRACK_EVENTS },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    logger.error('Erreur fil événements traçage', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
