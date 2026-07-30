import { Router } from 'express'
import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { TEST_SUBJECT_SIZE, TestSubject } from '../models/TestSubject.js'
import {
  buildSubjectSummaries,
  computeChapterTestSubjectCount,
} from '../utils/chapterTestSubjects.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { logger } from '../utils/logger.js'
import {
  getHardcodedQuestionsForChapter,
  listHardcodedQuestionsAdmin,
} from '../services/hardcodedQuestions.js'

const router = Router()
router.use(requireAdminAuth)

/** Mélange équitable (Fisher–Yates) puis prend les N premiers. */
function pickRandomQuestions(questions, count) {
  const pool = [...questions]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

async function ensureChapter(chapterId) {
  return Chapter.findById(chapterId)
}

async function loadSubjectWithQuestions(subject) {
  const questions = await Question.find({
    _id: { $in: subject.questionIds },
    chapterId: subject.chapterId,
  })
  return subject.toAdminJSON(questions)
}

router.get('/chapters/:chapterId/questions', async (req, res) => {
  try {
    const chapter = await ensureChapter(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const hardcoded = listHardcodedQuestionsAdmin(chapter)
    if (hardcoded) {
      return res.json({
        success: true,
        data: {
          chapter: { id: chapter._id, name: chapter.name, order: chapter.order },
          fileBased: true,
          hardcoded: true,
          awaitingFiles: false,
          readOnly: true,
          pagination: {
            page: 1,
            limit: hardcoded.length,
            total: hardcoded.length,
            pages: 1,
          },
          questions: hardcoded,
        },
      })
    }

    // Plus de banque Mongo éditable : les questions arrivent par fichiers code.
    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name, order: chapter.order },
        fileBased: true,
        hardcoded: false,
        awaitingFiles: true,
        readOnly: true,
        pagination: { page: 1, limit: 0, total: 0, pages: 1 },
        questions: [],
      },
    })
  } catch (error) {
    logger.error('Erreur liste questions:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

const FILE_BASED_QUESTIONS_ERROR =
  'Les questions sont fournies par fichiers (code + audio). Création, modification et upload désactivés.'

router.post('/chapters/:chapterId/questions', audit('create', 'question'), async (_req, res) => {
  return res.status(400).json({ success: false, error: FILE_BASED_QUESTIONS_ERROR })
})

router.patch('/chapters/:chapterId/questions/:questionId', audit('update', 'question'), async (_req, res) => {
  return res.status(400).json({ success: false, error: FILE_BASED_QUESTIONS_ERROR })
})

router.delete('/chapters/:chapterId/questions/:questionId', audit('delete', 'question'), async (_req, res) => {
  return res.status(400).json({ success: false, error: FILE_BASED_QUESTIONS_ERROR })
})

router.get('/chapters/:chapterId/test-subjects/current', async (req, res) => {
  try {
    const chapter = await ensureChapter(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const hardcoded = getHardcodedQuestionsForChapter(chapter)
    const publishedCount = hardcoded
      ? hardcoded.length
      : await Question.countDocuments({ chapterId: chapter._id, published: true })
    const bankCount = hardcoded
      ? hardcoded.length
      : await Question.countDocuments({ chapterId: chapter._id })
    const subjects = buildSubjectSummaries(publishedCount, String(chapter._id))

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        bankCount,
        publishedCount,
        requiredCount: TEST_SUBJECT_SIZE,
        subjectCount: computeChapterTestSubjectCount(publishedCount),
        autoSubjects: true,
        subjects,
        subject: null,
      },
    })
  } catch (error) {
    logger.error('Erreur sujet test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/chapters/:chapterId/test-subjects/generate', audit('generate', 'test_subject'), async (req, res) => {
  try {
    const chapter = await ensureChapter(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const questions = await Question.find({ chapterId: chapter._id })
    if (questions.length < TEST_SUBJECT_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Il faut au moins ${TEST_SUBJECT_SIZE} questions dans la banque (actuellement ${questions.length}).`,
      })
    }

    const selected = pickRandomQuestions(questions, TEST_SUBJECT_SIZE)
    const subject = await TestSubject.create({
      chapterId: chapter._id,
      questionIds: selected.map((question) => question._id),
      published: false,
    })

    res.status(201).json({
      success: true,
      data: {
        bankCount: questions.length,
        requiredCount: TEST_SUBJECT_SIZE,
        subject: await loadSubjectWithQuestions(subject),
      },
    })
  } catch (error) {
    logger.error('Erreur génération sujet test:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

router.patch('/chapters/:chapterId/test-subjects/:subjectId', audit('update', 'test_subject'), async (req, res) => {
  try {
    const subject = await TestSubject.findOne({
      _id: req.params.subjectId,
      chapterId: req.params.chapterId,
    })
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Sujet test introuvable' })
    }

    if (req.body.published !== undefined) {
      subject.published = Boolean(req.body.published)
      if (subject.published) {
        await TestSubject.updateMany(
          {
            chapterId: subject.chapterId,
            _id: { $ne: subject._id },
            published: true,
          },
          { $set: { published: false } },
        )
      }
    }

    await subject.save()
    res.json({
      success: true,
      data: { subject: await loadSubjectWithQuestions(subject) },
    })
  } catch (error) {
    logger.error('Erreur mise à jour sujet test:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/chapters/:chapterId/test-subjects/:subjectId', audit('delete', 'test_subject'), async (req, res) => {
  try {
    const subject = await TestSubject.findOneAndDelete({
      _id: req.params.subjectId,
      chapterId: req.params.chapterId,
    })
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Sujet test introuvable' })
    }

    res.json({ success: true, data: { deleted: true, id: String(subject._id) } })
  } catch (error) {
    logger.error('Erreur suppression sujet test:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/upload-audio', audit('create', 'question_audio'), async (_req, res) => {
  return res.status(400).json({ success: false, error: FILE_BASED_QUESTIONS_ERROR })
})

export default router
