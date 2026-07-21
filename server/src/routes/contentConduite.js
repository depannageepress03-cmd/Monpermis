import { Router } from 'express'
import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { MIN_COURSE_SECONDS } from '../models/User.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireSubscriptionAccess } from '../middleware/subscriptionAccess.js'
import {
  allChapterCoursesCompleted,
  serializeProgress,
} from '../utils/progress.js'

const router = Router()
const withConduiteAccess = [requireUserAuth, requireSubscriptionAccess('conduite')]

router.get('/chapters', ...withConduiteAccess, async (_req, res) => {
  try {
    const chapters = await ConduiteChapter.find({ published: true }).sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: {
        chapters: chapters
          .map((chapter) => chapter.toPublicJSON())
          .filter((chapter) => chapter.courses.length > 0),
      },
    })
  } catch (error) {
    console.error('Erreur contenu conduite public:', error)
    res.status(500).json({ success: false, error: 'Contenu indisponible' })
  }
})

router.get('/progress', ...withConduiteAccess, async (req, res) => {
  try {
    const chapterId = req.query.chapterId ? String(req.query.chapterId) : null
    res.json({
      success: true,
      data: serializeProgress(req.user, chapterId),
    })
  } catch (error) {
    console.error('Erreur lecture progression conduite:', error)
    res.status(500).json({ success: false, error: 'Progression indisponible' })
  }
})

router.post('/progress/start', ...withConduiteAccess, async (req, res) => {
  try {
    const { chapterId, courseId } = req.body ?? {}
    if (!chapterId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Chapitre et cours requis',
      })
    }

    const chapter = await ConduiteChapter.findById(chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(courseId)
    if (!course || !course.published) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
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
    console.error('Erreur démarrage session conduite:', error)
    res.status(500).json({ success: false, error: 'Démarrage impossible' })
  }
})

router.post('/progress', ...withConduiteAccess, async (req, res) => {
  try {
    const { chapterId, courseId } = req.body ?? {}

    if (!chapterId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Chapitre et cours requis',
      })
    }

    const chapter = await ConduiteChapter.findById(chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(courseId)
    if (!course || !course.published) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    await req.user.markCourseCompleted(chapterId, courseId)

    res.json({
      success: true,
      data: {
        completed: true,
        chapterId: String(chapterId),
        courseId: String(courseId),
        chapterCompleted: allChapterCoursesCompleted(req.user, chapter),
      },
    })
  } catch (error) {
    console.error('Erreur enregistrement progression conduite:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

export default router
