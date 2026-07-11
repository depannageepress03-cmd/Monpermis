import { Router } from 'express'
import { Question } from '../models/Question.js'
import { PracticeExam } from '../models/PracticeExam.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireSubscriptionAccess } from '../middleware/subscriptionAccess.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_PASS_SCORE,
  PRACTICE_EXAM_SIZE,
  isPracticeExamPassed,
  scoreLabel,
} from '../utils/practiceExam.js'
import { ensurePracticeExamSheets } from '../services/practiceExams.js'
import { Chapter } from '../models/Chapter.js'
import { allRevisionCoursesCompleted } from '../utils/progress.js'

const router = Router()
const withCodeAccess = [requireUserAuth, requireSubscriptionAccess('code')]

async function assertPracticeExamsUnlocked(user) {
  const chapters = await Chapter.find({ published: true }).sort({ order: 1, createdAt: 1 })
  if (!allRevisionCoursesCompleted(user, chapters)) {
    const error = new Error(
      'Terminez tous les cours de chaque chapitre avant d’accéder aux examens test. Vous pouvez encore répondre aux questions et passer le sujet test de chaque chapitre.',
    )
    error.status = 403
    throw error
  }
}

function evaluateAnswers(question, answerIds) {
  const correctIds = new Set(
    (question.answers || [])
      .filter((answer) => answer.isCorrect)
      .map((answer) => String(answer._id)),
  )
  const selectedIds = new Set((answerIds || []).map((id) => String(id)))
  const isCorrect =
    correctIds.size === selectedIds.size &&
    [...correctIds].every((id) => selectedIds.has(id))
  return { isCorrect, correctAnswerIds: [...correctIds] }
}

router.get('/practice-exams', ...withCodeAccess, async (req, res) => {
  try {
    const chapters = await Chapter.find({ published: true }).sort({ order: 1, createdAt: 1 })
    const unlocked = allRevisionCoursesCompleted(req.user, chapters)

    const ensured = await ensurePracticeExamSheets()
    if (ensured.error) {
      return res.json({
        success: true,
        data: {
          bankCount: ensured.bankCount || 0,
          examCount: 0,
          requiredSize: PRACTICE_EXAM_SIZE,
          examTotal: PRACTICE_EXAM_COUNT,
          passScore: PRACTICE_EXAM_PASS_SCORE,
          unlocked,
          completedCount: 0,
          passedCount: 0,
          exams: [],
          scores: [],
          message: ensured.error,
        },
      })
    }

    if (!unlocked) {
      return res.json({
        success: true,
        data: {
          bankCount: ensured.bankCount,
          examCount: 0,
          requiredSize: PRACTICE_EXAM_SIZE,
          examTotal: PRACTICE_EXAM_COUNT,
          passScore: PRACTICE_EXAM_PASS_SCORE,
          unlocked: false,
          completedCount: 0,
          passedCount: 0,
          exams: [],
          scores: [],
          message:
            'Terminez tous les cours de chaque chapitre pour débloquer les examens test. En attendant, répondez aux questions et passez le sujet test de chaque chapitre.',
        },
      })
    }

    const exams = await PracticeExam.find({ published: true }).sort({ examNumber: 1 })
    const attempts = await PracticeExamAttempt.find({
      userId: req.user._id,
      status: 'completed',
    }).sort({ examNumber: 1, completedAt: -1 })

    const bestByExam = new Map()
    for (const attempt of attempts) {
      const key = attempt.examNumber
      const current = bestByExam.get(key)
      if (!current || attempt.correct > current.correct) {
        bestByExam.set(key, attempt)
      }
    }

    const inProgress = await PracticeExamAttempt.find({
      userId: req.user._id,
      status: 'in_progress',
    })

    const inProgressByExam = new Map(
      inProgress.map((attempt) => [attempt.examNumber, attempt]),
    )

    res.json({
      success: true,
      data: {
        bankCount: ensured.bankCount,
        examCount: exams.length,
        requiredSize: PRACTICE_EXAM_SIZE,
        examTotal: PRACTICE_EXAM_COUNT,
        passScore: PRACTICE_EXAM_PASS_SCORE,
        unlocked: true,
        completedCount: bestByExam.size,
        passedCount: [...bestByExam.values()].filter((a) => isPracticeExamPassed(a.correct))
          .length,
        exams: exams.map((exam) => {
          const best = bestByExam.get(exam.examNumber)
          const active = inProgressByExam.get(exam.examNumber)
          return {
            id: exam._id,
            examNumber: exam.examNumber,
            questionCount: PRACTICE_EXAM_SIZE,
            status: active ? 'in_progress' : best ? 'completed' : 'available',
            attemptId: active ? String(active._id) : null,
            score: best
              ? {
                  correct: best.correct,
                  total: best.total || PRACTICE_EXAM_SIZE,
                  scoreLabel: scoreLabel(best.correct, best.total || PRACTICE_EXAM_SIZE),
                  passed: isPracticeExamPassed(best.correct),
                  completedAt: best.completedAt,
                }
              : null,
          }
        }),
        scores: [...bestByExam.values()]
          .sort((a, b) => a.examNumber - b.examNumber)
          .map((attempt) => attempt.toScoreJSON()),
      },
    })
  } catch (error) {
    console.error('Erreur liste examens test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/practice-exams/:examNumber/start', ...withCodeAccess, async (req, res) => {
  try {
    const examNumber = Number(req.params.examNumber)
    if (!Number.isInteger(examNumber) || examNumber < 1 || examNumber > PRACTICE_EXAM_COUNT) {
      return res.status(400).json({ success: false, error: 'Numéro d’examen invalide' })
    }

    try {
      await assertPracticeExamsUnlocked(req.user)
    } catch (gateError) {
      return res.status(gateError.status || 403).json({
        success: false,
        error: gateError.message,
      })
    }

    const ensured = await ensurePracticeExamSheets()
    if (ensured.error) {
      return res.status(400).json({ success: false, error: ensured.error })
    }

    const exam = await PracticeExam.findOne({ examNumber, published: true })
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Examen introuvable' })
    }

    let attempt = await PracticeExamAttempt.findOne({
      userId: req.user._id,
      examNumber,
      status: 'in_progress',
    })

    if (!attempt) {
      attempt = await PracticeExamAttempt.create({
        userId: req.user._id,
        examId: exam._id,
        examNumber,
        questionIds: exam.questionIds,
        responses: [],
        status: 'in_progress',
        total: PRACTICE_EXAM_SIZE,
      })
    }

    const questions = await Question.find({ _id: { $in: attempt.questionIds } })
    res.status(201).json({
      success: true,
      data: { attempt: attempt.toPublicJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur démarrage examen test:', error)
    res.status(500).json({ success: false, error: 'Démarrage impossible' })
  }
})

router.get('/practice-exams/attempts/:attemptId', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable' })
    }

    const questions = await Question.find({ _id: { $in: attempt.questionIds } })
    res.json({
      success: true,
      data: { attempt: attempt.toPublicJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur tentative examen:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/practice-exams/attempts/:attemptId/check', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'in_progress',
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable ou terminée' })
    }

    const { questionId, answerIds } = req.body ?? {}
    if (!questionId || !Array.isArray(answerIds)) {
      return res.status(400).json({ success: false, error: 'Question et réponses requises' })
    }

    const allowed = (attempt.questionIds || []).some((id) => String(id) === String(questionId))
    if (!allowed) {
      return res.status(400).json({ success: false, error: 'Question hors examen' })
    }

    if ((attempt.responses || []).some((r) => String(r.questionId) === String(questionId))) {
      return res.status(400).json({ success: false, error: 'Question déjà répondue' })
    }

    const question = await Question.findById(questionId)
    if (!question || !question.published) {
      return res.status(404).json({ success: false, error: 'Question introuvable' })
    }

    const { isCorrect, correctAnswerIds } = evaluateAnswers(question, answerIds)
    attempt.responses.push({
      questionId,
      answerIds: answerIds.map(String),
      isCorrect,
    })
    await attempt.save()

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswerIds,
        answeredCount: attempt.responses.length,
        total: PRACTICE_EXAM_SIZE,
        liveCorrect: attempt.responses.filter((r) => r.isCorrect).length,
      },
    })
  } catch (error) {
    console.error('Erreur check examen test:', error)
    res.status(500).json({ success: false, error: 'Vérification impossible' })
  }
})

router.post('/practice-exams/attempts/:attemptId/complete', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable' })
    }

    if (attempt.status === 'completed') {
      return res.json({ success: true, data: { attempt: attempt.toScoreJSON() } })
    }

    const correct = (attempt.responses || []).filter((r) => r.isCorrect).length
    attempt.correct = correct
    attempt.total = PRACTICE_EXAM_SIZE
    attempt.passed = isPracticeExamPassed(correct)
    attempt.status = 'completed'
    attempt.completedAt = new Date()
    await attempt.save()

    res.json({
      success: true,
      data: { attempt: attempt.toScoreJSON() },
    })
  } catch (error) {
    console.error('Erreur fin examen test:', error)
    res.status(500).json({ success: false, error: 'Validation impossible' })
  }
})

router.get('/practice-exams/scores', ...withCodeAccess, async (req, res) => {
  try {
    const attempts = await PracticeExamAttempt.find({
      userId: req.user._id,
      status: 'completed',
    }).sort({ examNumber: 1, completedAt: -1 })

    const bestByExam = new Map()
    for (const attempt of attempts) {
      const current = bestByExam.get(attempt.examNumber)
      if (!current || attempt.correct > current.correct) {
        bestByExam.set(attempt.examNumber, attempt)
      }
    }

    const scores = [...bestByExam.values()]
      .sort((a, b) => a.examNumber - b.examNumber)
      .map((attempt) => attempt.toScoreJSON())

    res.json({
      success: true,
      data: {
        passScore: PRACTICE_EXAM_PASS_SCORE,
        examTotal: PRACTICE_EXAM_COUNT,
        completedCount: scores.length,
        passedCount: scores.filter((s) => s.passed).length,
        scores,
      },
    })
  } catch (error) {
    console.error('Erreur notes examens test:', error)
    res.status(500).json({ success: false, error: 'Notes indisponibles' })
  }
})

export default router
