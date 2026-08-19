import { Router } from 'express'
import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { RevisionCourse } from '../models/RevisionCourse.js'
import { MIN_COURSE_SECONDS } from '../models/User.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireModuleAccess } from '../middleware/moduleAccess.js'
import {
  allChapterCoursesCompleted,
  serializeProgress,
} from '../utils/progress.js'
import { buildLearnerJourney } from '../utils/learnerJourney.js'
import {
  ensureNotionsHaveChapter,
  ensureStandaloneRevisionCourses,
} from '../services/migrateRevisionCourses.js'

/** Clé de progression pour les cours hors chapitre. */
const STANDALONE_COURSE_CHAPTER = 'standalone'
import {
  buildSubjectSummaries,
  pickQuestionsForSubject,
  TEST_SUBJECT_SIZE,
} from '../utils/chapterTestSubjects.js'
import {
  checkHardcodedAnswers,
  hardcodedAsQuestionDocs,
  listHardcodedQuestionsPublic,
} from '../services/hardcodedQuestions.js'
import { STANDARD_REVISION_CHAPTER_COUNT } from '../data/standardRevisionChapters.js'
import { ensureStandardRevisionChapters } from '../services/standardRevisionChapters.js'

const router = Router()
const withCodeAccess = [requireUserAuth, requireModuleAccess('code')]

/** Retrouve une notion par id, en tolérant un id qui n'est pas un ObjectId. */
async function findNotion(courseId) {
  try {
    return await RevisionCourse.findById(courseId)
  } catch {
    return null
  }
}

async function loadChapterQuestionBank(chapter) {
  const hardcoded = hardcodedAsQuestionDocs(chapter)
  if (hardcoded) return hardcoded
  // Banques hors fichiers : vide (plus de questions Mongo pour le code).
  return []
}

router.get('/chapters', ...withCodeAccess, async (_req, res) => {
  try {
    await ensureStandardRevisionChapters()
    await ensureStandaloneRevisionCourses()
    const chapters = await Chapter.find({
      order: { $gte: 1, $lte: STANDARD_REVISION_CHAPTER_COUNT },
    }).sort({
      order: 1,
      createdAt: 1,
    })
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

/** Chapitres du parcours Cours, avec les notions publiées de chacun. */
router.get('/course-chapters', ...withCodeAccess, async (_req, res) => {
  try {
    await ensureStandardRevisionChapters()
    await ensureStandaloneRevisionCourses()
    await ensureNotionsHaveChapter()

    const [chapters, notions] = await Promise.all([
      Chapter.find({
        order: { $gte: 1, $lte: STANDARD_REVISION_CHAPTER_COUNT },
      }).sort({ order: 1, createdAt: 1 }),
      RevisionCourse.find({ published: true }).sort({ order: 1, createdAt: 1 }),
    ])

    const byChapter = new Map()
    for (const notion of notions) {
      const key = notion.chapter ? String(notion.chapter) : ''
      if (!key) continue
      if (!byChapter.has(key)) byChapter.set(key, [])
      byChapter.get(key).push(notion.toPublicJSON())
    }

    // Un chapitre sans notion publiée n'a rien à montrer à l'élève.
    const data = chapters
      .map((chapter) => ({
        id: String(chapter._id),
        name: chapter.name,
        order: chapter.order,
        courses: byChapter.get(String(chapter._id)) || [],
      }))
      .filter((chapter) => chapter.courses.length > 0)

    res.json({ success: true, data: { chapters: data } })
  } catch (error) {
    console.error('Erreur chapitres de cours:', error)
    res.status(500).json({ success: false, error: 'Cours indisponibles' })
  }
})

/** Liste plate de toutes les notions publiées (chaque item porte son chapterId). */
router.get('/courses', ...withCodeAccess, async (_req, res) => {
  try {
    await ensureStandaloneRevisionCourses()
    await ensureNotionsHaveChapter()
    const courses = await RevisionCourse.find({ published: true }).sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: { courses: courses.map((course) => course.toPublicJSON()) },
    })
  } catch (error) {
    console.error('Erreur liste cours publics:', error)
    res.status(500).json({ success: false, error: 'Cours indisponibles' })
  }
})

router.get('/courses/:courseId', ...withCodeAccess, async (req, res) => {
  try {
    await ensureStandaloneRevisionCourses()
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course || !course.published) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }
    res.json({ success: true, data: { course: course.toPublicJSON() } })
  } catch (error) {
    console.error('Erreur détail cours:', error)
    res.status(500).json({ success: false, error: 'Cours indisponible' })
  }
})

router.get('/chapters/:chapterId/questions', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const hardcodedPublic = listHardcodedQuestionsPublic(chapter)
    return res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        questions: hardcodedPublic || [],
      },
    })
  } catch (error) {
    console.error('Erreur questions publiques:', error)
    res.status(500).json({ success: false, error: 'Questions indisponibles' })
  }
})

router.get('/chapters/:chapterId/test-subjects', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const bank = await loadChapterQuestionBank(chapter)
    const publishedCount = bank.length
    const subjects = buildSubjectSummaries(publishedCount, String(chapter._id))

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        publishedCount,
        questionsPerSubject: Math.min(TEST_SUBJECT_SIZE, publishedCount),
        requiredCount: TEST_SUBJECT_SIZE,
        subjects,
      },
    })
  } catch (error) {
    console.error('Erreur liste sujets test:', error)
    res.status(500).json({ success: false, error: 'Sujets test indisponibles' })
  }
})

router.get('/chapters/:chapterId/test-subjects/:subjectNumber', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const subjectNumber = Math.max(1, parseInt(String(req.params.subjectNumber), 10) || 0)
    const bank = await loadChapterQuestionBank(chapter)

    if (bank.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune question publiée pour ce chapitre',
      })
    }

    const subjects = buildSubjectSummaries(bank.length, String(chapter._id))
    const summary = subjects.find((item) => item.number === subjectNumber)
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Sujet test introuvable' })
    }

    const selected = pickQuestionsForSubject(bank, subjectNumber, String(chapter._id))

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        subject: {
          ...summary,
          questionCount: selected.length,
          questions: selected.map((question) =>
            typeof question.toPublicJSON === 'function'
              ? question.toPublicJSON()
              : question,
          ),
        },
      },
    })
  } catch (error) {
    console.error('Erreur sujet test public:', error)
    res.status(500).json({ success: false, error: 'Sujet test indisponible' })
  }
})

/** Compat : redirige vers le Sujet 1 (anciens clients). */
router.get('/chapters/:chapterId/test-subject', ...withCodeAccess, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
    if (!chapter || !chapter.published) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const bank = await loadChapterQuestionBank(chapter)

    if (bank.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune question publiée pour ce chapitre',
      })
    }

    const selected = pickQuestionsForSubject(bank, 1, String(chapter._id))

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        subject: {
          id: `${chapter._id}-sujet-1`,
          number: 1,
          label: 'Sujet 1',
          chapterId: chapter._id,
          questionCount: selected.length,
          questions: selected.map((question) =>
            typeof question.toPublicJSON === 'function'
              ? question.toPublicJSON()
              : question,
          ),
        },
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

    const hardcodedCheck = checkHardcodedAnswers(chapter, questionId, answerIds)
    if (hardcodedCheck) {
      return res.json({
        success: true,
        data: hardcodedCheck,
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
    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Cours requis',
      })
    }

    // Notion : la progression reste indexée sur STANDALONE_COURSE_CHAPTER,
    // quel que soit le chapitre de rattachement, pour ne pas perdre l'historique.
    await ensureStandaloneRevisionCourses()
    const notion = await findNotion(courseId)
    if (notion) {
      if (!notion.published) {
        return res.status(404).json({ success: false, error: 'Cours introuvable' })
      }
      const progressChapterId = STANDALONE_COURSE_CHAPTER
      const session = await req.user.startCourseSession(progressChapterId, courseId)
      const secondsRemaining = req.user.getCourseUnlockSeconds(progressChapterId, courseId)
      return res.json({
        success: true,
        data: {
          chapterId: progressChapterId,
          courseId: String(courseId),
          openedAt: session?.openedAt ?? null,
          secondsRemaining,
          minCourseSeconds: MIN_COURSE_SECONDS,
          alreadyCompleted: req.user.hasCompletedCourse(progressChapterId, courseId),
        },
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

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Cours requis',
      })
    }

    await ensureStandaloneRevisionCourses()
    const notion = await findNotion(courseId)
    if (notion) {
      if (!notion.published) {
        return res.status(404).json({ success: false, error: 'Cours introuvable' })
      }
      const progressChapterId = STANDALONE_COURSE_CHAPTER
      await req.user.markCourseCompleted(progressChapterId, courseId)
      return res.json({
        success: true,
        data: {
          completed: true,
          chapterId: progressChapterId,
          courseId: String(courseId),
          chapterQuizUnlocked: true,
        },
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
