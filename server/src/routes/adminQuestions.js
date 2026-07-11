import { Router } from 'express'
import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { TEST_SUBJECT_SIZE, TestSubject } from '../models/TestSubject.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audioUpload } from '../middleware/upload.js'

const router = Router()
router.use(requireAdminAuth)

function nextOrder(items) {
  if (!items.length) return 0
  return Math.max(...items.map((item) => item.order ?? 0)) + 1
}

/** Mélange équitable (Fisher–Yates) puis prend les N premiers. */
function pickRandomQuestions(questions, count) {
  const pool = [...questions]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function normalizeAnswers(rawAnswers) {
  if (!Array.isArray(rawAnswers) || rawAnswers.length < 1) {
    return { error: 'Ajoutez au moins une réponse' }
  }

  const answers = rawAnswers.map((answer, index) => ({
    label:
      String(answer.label || String.fromCharCode(97 + index)).trim() ||
      String.fromCharCode(97 + index),
    text: '',
    audioUrl: String(answer.audioUrl || '').trim(),
    isCorrect: Boolean(answer.isCorrect),
  }))

  if (!answers.some((answer) => answer.isCorrect)) {
    return { error: 'Cochez au moins une bonne réponse' }
  }

  if (answers.some((answer) => !answer.audioUrl)) {
    return { error: 'Chaque réponse doit avoir un audio' }
  }

  return { answers }
}

function normalizePrompt(rawPrompt = {}) {
  const text = String(rawPrompt.text || '').trim()
  const audioUrl = String(rawPrompt.audioUrl || '').trim()
  const imageUrls = Array.isArray(rawPrompt.imageUrls)
    ? rawPrompt.imageUrls.map((url) => String(url).trim()).filter(Boolean)
    : []

  if (!text && !audioUrl && imageUrls.length === 0) {
    return { error: 'La question doit contenir au moins un texte, un audio ou une image' }
  }

  return { prompt: { text, audioUrl, imageUrls } }
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

    const questions = await Question.find({ chapterId: chapter._id }).sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        questions: questions.map((question) => question.toAdminJSON()),
      },
    })
  } catch (error) {
    console.error('Erreur liste questions:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/chapters/:chapterId/questions', async (req, res) => {
  try {
    const chapter = await ensureChapter(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const promptResult = normalizePrompt(req.body.prompt)
    if (promptResult.error) {
      return res.status(400).json({ success: false, error: promptResult.error })
    }

    const answersResult = normalizeAnswers(req.body.answers)
    if (answersResult.error) {
      return res.status(400).json({ success: false, error: answersResult.error })
    }

    const existing = await Question.find({ chapterId: chapter._id }).select('order')
    const question = await Question.create({
      chapterId: chapter._id,
      order: nextOrder(existing),
      published: Boolean(req.body.published),
      prompt: promptResult.prompt,
      answers: answersResult.answers,
    })

    res.status(201).json({
      success: true,
      data: { question: question.toAdminJSON() },
    })
  } catch (error) {
    console.error('Erreur création question:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/chapters/:chapterId/questions/:questionId', async (req, res) => {
  try {
    const question = await Question.findOne({
      _id: req.params.questionId,
      chapterId: req.params.chapterId,
    })
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question introuvable' })
    }

    if (req.body.prompt !== undefined) {
      const promptResult = normalizePrompt(req.body.prompt)
      if (promptResult.error) {
        return res.status(400).json({ success: false, error: promptResult.error })
      }
      question.prompt = promptResult.prompt
    }

    if (req.body.answers !== undefined) {
      const answersResult = normalizeAnswers(req.body.answers)
      if (answersResult.error) {
        return res.status(400).json({ success: false, error: answersResult.error })
      }
      question.answers = answersResult.answers
    }

    if (req.body.published !== undefined) {
      question.published = Boolean(req.body.published)
    }

    if (req.body.order !== undefined) {
      question.order = Number(req.body.order) || 0
    }

    await question.save()
    res.json({ success: true, data: { question: question.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur mise à jour question:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/chapters/:chapterId/questions/:questionId', async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({
      _id: req.params.questionId,
      chapterId: req.params.chapterId,
    })
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question introuvable' })
    }

    res.json({ success: true, data: { deleted: true, id: String(question._id) } })
  } catch (error) {
    console.error('Erreur suppression question:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.get('/chapters/:chapterId/test-subjects/current', async (req, res) => {
  try {
    const chapter = await ensureChapter(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const bankCount = await Question.countDocuments({ chapterId: chapter._id })
    const subject = await TestSubject.findOne({ chapterId: chapter._id }).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name },
        bankCount,
        requiredCount: TEST_SUBJECT_SIZE,
        subject: subject ? await loadSubjectWithQuestions(subject) : null,
      },
    })
  } catch (error) {
    console.error('Erreur sujet test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/chapters/:chapterId/test-subjects/generate', async (req, res) => {
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
    console.error('Erreur génération sujet test:', error)
    res.status(500).json({ success: false, error: 'Génération impossible' })
  }
})

router.patch('/chapters/:chapterId/test-subjects/:subjectId', async (req, res) => {
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
    console.error('Erreur mise à jour sujet test:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/chapters/:chapterId/test-subjects/:subjectId', async (req, res) => {
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
    console.error('Erreur suppression sujet test:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/upload-audio', (req, res) => {
  audioUpload.single('audio')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier audio fourni' })
    }

    res.status(201).json({
      success: true,
      data: {
        audioUrl: `/uploads/audio/${req.file.filename}`,
        mediaBytes: req.file.size || 0,
      },
    })
  })
})

export default router
