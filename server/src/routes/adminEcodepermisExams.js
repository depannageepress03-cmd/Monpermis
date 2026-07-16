import { Router } from 'express'
import { ECodePermisExam } from '../models/ECodePermisExam.js'
import { ECodePermisExamAttempt } from '../models/ECodePermisExamAttempt.js'
import { Question } from '../models/Question.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import {
  ECODEPERMIS_EXAM_COUNT,
  ECODEPERMIS_EXAM_PASS_SCORE,
  ECODEPERMIS_EXAM_SIZE,
} from '../utils/ecodepermis.js'
import {
  countPublishedQuestions,
  ensureECodePermisExamSheets,
  generateECodePermisExamSheets,
} from '../services/ecodepermisExams.js'

const router = Router()
router.use(requireAdminAuth)

router.get('/exams', async (_req, res) => {
  try {
    const bankCount = await countPublishedQuestions()
    const exams = await ECodePermisExam.find().sort({ examNumber: 1 })
    const recentAttempts = await ECodePermisExamAttempt.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(40)

    const userIds = [...new Set(recentAttempts.map((a) => String(a.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email')
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    res.json({
      success: true,
      data: {
        bankCount,
        requiredSize: ECODEPERMIS_EXAM_SIZE,
        examTotal: ECODEPERMIS_EXAM_COUNT,
        passScore: ECODEPERMIS_EXAM_PASS_SCORE,
        examCount: exams.length,
        ready: exams.length === ECODEPERMIS_EXAM_COUNT && bankCount >= ECODEPERMIS_EXAM_SIZE,
        exams: exams.map((exam) => ({
          id: exam._id,
          examNumber: exam.examNumber,
          questionCount: (exam.questionIds || []).length,
          published: Boolean(exam.published),
          updatedAt: exam.updatedAt,
        })),
        recentResults: recentAttempts.map((attempt) => {
          const user = userMap.get(String(attempt.userId))
          return {
            ...attempt.toScoreJSON(),
            learnerName: user
              ? `${user.firstName} ${user.lastName}`
              : 'Apprenant',
            learnerEmail: user?.email || '',
          }
        }),
      },
    })
  } catch (error) {
    console.error('Erreur admin E-Codepermis:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/exams/generate', async (_req, res) => {
  try {
    const result = await generateECodePermisExamSheets()
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.status(201).json({
      success: true,
      data: {
        bankCount: result.bankCount,
        requiredSize: ECODEPERMIS_EXAM_SIZE,
        examTotal: ECODEPERMIS_EXAM_COUNT,
        passScore: ECODEPERMIS_EXAM_PASS_SCORE,
        examCount: result.examCount,
        exams: result.exams.map((exam) => ({
          id: exam.id,
          examNumber: exam.examNumber,
          questionCount: exam.questionCount,
          published: exam.published,
        })),
      },
    })
  } catch (error) {
    console.error('Erreur génération E-Codepermis:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

router.get('/exams/:examId', async (req, res) => {
  try {
    const exam = await ECodePermisExam.findById(req.params.examId)
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Épreuve introuvable' })
    }
    const questions = await Question.find({ _id: { $in: exam.questionIds } })
    res.json({
      success: true,
      data: { exam: exam.toAdminJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur détail épreuve:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/exams/:examId', async (req, res) => {
  try {
    const exam = await ECodePermisExam.findById(req.params.examId)
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Épreuve introuvable' })
    }
    if (req.body.published !== undefined) {
      exam.published = Boolean(req.body.published)
    }
    await exam.save()
    const questions = await Question.find({ _id: { $in: exam.questionIds } })
    res.json({
      success: true,
      data: { exam: exam.toAdminJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur mise à jour épreuve:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/exams/ensure', async (_req, res) => {
  try {
    const result = await ensureECodePermisExamSheets()
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({
      success: true,
      data: {
        bankCount: result.bankCount,
        examCount: result.examCount,
        generated: Boolean(result.generated),
        passScore: ECODEPERMIS_EXAM_PASS_SCORE,
      },
    })
  } catch (error) {
    console.error('Erreur ensure E-Codepermis:', error)
    res.status(500).json({ success: false, error: 'Initialisation impossible' })
  }
})

export default router
