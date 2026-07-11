import { Router } from 'express'
import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { TestSubject } from '../models/TestSubject.js'
import { MIN_COURSE_SECONDS } from '../models/User.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireSubscriptionAccess } from '../middleware/subscriptionAccess.js'
import {
  allChapterCoursesCompleted,
  isCourseSequentiallyUnlocked,
  serializeProgress,
} from '../utils/progress.js'
import { buildLearnerJourney } from '../utils/learnerJourney.js'

const router = Router()
const withCodeAccess = [requireUserAuth, requireSubscriptionAccess('code')]

router.get('/chapters', ...withCodeAccess, async (_req, res) => {
  try {
    const chapters = await Chapter.find({ published: true }).sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: {
        chapters: chapters.map((chapter) => chapter.toPublicJSON()),
      },
    })
  } catch (error) {
    console.error('Erreur contenu public:', error)
    res.status(500).json({ success: false, error: 'Contenu indisponible' })
  }
})

router.get('/chapters/:chapterId/questions', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const questions = await Question.find({
      chapterId: chapter._id,
      published: true,
    }).sort({ order: 1, createdAt: 1 })

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        questions: questions.map((question) => question.toPublicJSON()),
      },
    })
  } catch (error) {
    console.error('Erreur questions publiques:', error)
    res.status(500).json({ success: false, error: 'Questions indisponibles' })
  }
})

router.get('/chapters/:chapterId/test-subject', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    if (!allChapterCoursesCompleted(req.user, chapter)) {
      return res.status(403).json({
        success: false,
        error: 'Terminez tous les cours du chapitre pour accéder au sujet test',
      })
    }

    const subject = await TestSubject.findOne({
      chapterId: chapter._id,
      published: true,
    }).sort({ createdAt: -1 })

    if (!subject) {
      return res.status(404).json({ success: false, error: 'Aucun sujet test publié' })
    }

    const questions = await Question.find({
      _id: { $in: subject.questionIds },
      chapterId: chapter._id,
    })

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        subject: subject.toPublicJSON(questions),
      },
    })
  } catch (error) {
    console.error('Erreur sujet test public:', error)
    res.status(500).json({ success: false, error: 'Sujet test indisponible' })
  }
})

router.post('/chapters/:chapterId/questions/check', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const { questionId, answerIds } = req.body ?? {}
    if (!questionId || !Array.isArray(answerIds)) {
      return res.status(400).json({
        success: false,
        error: 'Question et réponses requises',
      })
    }

    const question = await Question.findOne({
      _id: questionId,
      chapterId: chapter._id,
      published: true,
    })
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question introuvable' })
    }

    const correctIds = new Set(
      (question.answers || [])
        .filter((answer) => answer.isCorrect)
        .map((answer) => String(answer._id)),
    )
    const selectedIds = new Set(answerIds.map((id) => String(id)))

    const isCorrect =
      correctIds.size === selectedIds.size &&
      [...correctIds].every((id) => selectedIds.has(id))

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswerIds: [...correctIds],
      },
    })
  } catch (error) {
    console.error('Erreur vérification question:', error)
    res.status(500).json({ success: false, error: 'Vérification impossible' })
  }
})

router.get('/progress', ...withCodeAccess, async (req, res) => {
  try {
    const chapterId = req.query.chapterId ? String(req.query.chapterId) : null
    res.json({
      success: true,
      data: serializeProgress(req.user, chapterId),
    })
  } catch (error) {
    console.error('Erreur lecture progression:', error)
    res.status(500).json({ success: false, error: 'Progression indisponible' })
  }
})

router.get('/progress/journey', ...withCodeAccess, async (req, res) => {
  try {
    const journey = await buildLearnerJourney(req.user)
    res.json({
      success: true,
      data: journey,
    })
  } catch (error) {
    console.error('Erreur parcours apprenant:', error)
    res.status(500).json({ success: false, error: 'Parcours indisponible' })
  }
})

router.post('/progress/start', ...withCodeAccess, async (req, res) => {
  try {
    const { chapterId, courseId } = req.body ?? {}
    if (!chapterId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Chapitre et cours requis',
      })
    }

    const chapter = await Chapter.findById(chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(courseId)
    if (!course || !course.published) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    if (!isCourseSequentiallyUnlocked(req.user, chapter, courseId)) {
      return res.status(403).json({
        success: false,
        error: 'Terminez le cours précédent pour accéder à celui-ci',
      })
    }

    const session = await req.user.startCourseSession(chapterId, courseId)
    const secondsRemaining = req.user.getCourseUnlockSeconds(chapterId, courseId)

    res.json({
      success: true,
      data: {
        chapterId: String(chapterId),
        courseId: String(courseId),
        openedAt: session?.openedAt ?? null,
        secondsRemaining,
        minCourseSeconds: MIN_COURSE_SECONDS,
        alreadyCompleted: req.user.hasCompletedCourse(chapterId, courseId),
      },
    })
  } catch (error) {
    console.error('Erreur démarrage session cours:', error)
    res.status(500).json({ success: false, error: 'Démarrage impossible' })
  }
})

router.post('/progress', ...withCodeAccess, async (req, res) => {
  try {
    const { chapterId, courseId } = req.body ?? {}

    if (!chapterId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Chapitre et cours requis',
      })
    }

    const chapter = await Chapter.findById(chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(courseId)
    if (!course || !course.published) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    if (!isCourseSequentiallyUnlocked(req.user, chapter, courseId)) {
      return res.status(403).json({
        success: false,
        error: 'Terminez le cours précédent avant de valider celui-ci',
      })
    }

    const secondsRemaining = req.user.getCourseUnlockSeconds(chapterId, courseId)
    if (secondsRemaining > 0) {
      return res.status(403).json({
        success: false,
        error: `Passez encore ${secondsRemaining}s sur ce cours avant de le valider`,
        data: { secondsRemaining, minCourseSeconds: MIN_COURSE_SECONDS },
      })
    }

    await req.user.markCourseCompleted(chapterId, courseId)

    res.json({
      success: true,
      data: {
        completed: true,
        chapterId: String(chapterId),
        courseId: String(courseId),
        chapterQuizUnlocked: allChapterCoursesCompleted(req.user, chapter),
      },
    })
  } catch (error) {
    console.error('Erreur enregistrement progression:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

router.post('/progress/test', ...withCodeAccess, async (req, res) => {
  try {
    const { chapterId, correct, total } = req.body ?? {}
    if (!chapterId) {
      return res.status(400).json({ success: false, error: 'Chapitre requis' })
    }

    const chapter = await Chapter.findById(chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    if (!allChapterCoursesCompleted(req.user, chapter)) {
      return res.status(403).json({
        success: false,
        error: 'Terminez tous les cours avant de valider le sujet test',
      })
    }

    await req.user.markTestCompleted(chapterId, correct, total)

    res.json({
      success: true,
      data: {
        completed: true,
        chapterId: String(chapterId),
        correct: Number(correct) || 0,
        total: Number(total) || 0,
      },
    })
  } catch (error) {
    console.error('Erreur validation sujet test:', error)
    res.status(500).json({ success: false, error: 'Validation impossible' })
  }
})

export default router
