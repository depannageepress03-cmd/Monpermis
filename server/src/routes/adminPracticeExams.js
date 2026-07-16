import { Router } from 'express'
import { PracticeExam } from '../models/PracticeExam.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { Question } from '../models/Question.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_PASS_SCORE,
  PRACTICE_EXAM_SIZE,
} from '../utils/practiceExam.js'
import {
  countPublishedQuestions,
  ensurePracticeExamSheets,
  generatePracticeExamSheets,
} from '../services/practiceExams.js'

const router = Router()
router.use(requireAdminAuth)

router.get('/practice-exams', async (_req, res) => {
  try {
    const bankCount = await countPublishedQuestions()
    const exams = await PracticeExam.find().sort({ examNumber: 1 })
    const recentAttempts = await PracticeExamAttempt.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(40)

    const userIds = [...new Set(recentAttempts.map((a) => String(a.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email')
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    res.json({
      success: true,
      data: {
        bankCount,
        requiredSize: PRACTICE_EXAM_SIZE,
        examTotal: PRACTICE_EXAM_COUNT,
        passScore: PRACTICE_EXAM_PASS_SCORE,
        examCount: exams.length,
        ready: exams.length === PRACTICE_EXAM_COUNT && bankCount >= PRACTICE_EXAM_SIZE,
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
    console.error('Erreur admin examens test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/practice-exams/generate', async (_req, res) => {
  try {
    const result = await generatePracticeExamSheets()
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.status(201).json({
      success: true,
      data: {
        bankCount: result.bankCount,
        requiredSize: PRACTICE_EXAM_SIZE,
        examTotal: PRACTICE_EXAM_COUNT,
        passScore: PRACTICE_EXAM_PASS_SCORE,
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
    console.error('Erreur génération examens test:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

router.get('/practice-exams/:examId', async (req, res) => {
  try {
    const exam = await PracticeExam.findById(req.params.examId)
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Examen introuvable' })
    }
    const questions = await Question.find({ _id: { $in: exam.questionIds } })
    res.json({
      success: true,
      data: { exam: exam.toAdminJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur détail examen test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/practice-exams/:examId', async (req, res) => {
  try {
    const exam = await PracticeExam.findById(req.params.examId)
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Examen introuvable' })
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
    console.error('Erreur mise à jour examen test:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/practice-exams/ensure', async (_req, res) => {
  try {
    const result = await ensurePracticeExamSheets()
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({
      success: true,
      data: {
        bankCount: result.bankCount,
        examCount: result.examCount,
        generated: Boolean(result.generated),
        passScore: PRACTICE_EXAM_PASS_SCORE,
      },
    })
  } catch (error) {
    console.error('Erreur ensure examens test:', error)
    res.status(500).json({ success: false, error: 'Initialisation impossible' })
  }
})

export default router
