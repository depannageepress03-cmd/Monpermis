import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Chapter } from '../models/Chapter.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireSubscriptionAccess } from '../middleware/subscriptionAccess.js'
import {
  buildCourseContext,
  buildTutorSystemPrompt,
  createTutorReply,
} from '../services/anthropic.js'
import { publishedCourses } from '../utils/progress.js'

const router = Router()
const withAiChatAccess = [requireUserAuth, requireSubscriptionAccess('aiChat')]

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ai-tutor:${req.user?._id || 'anon'}`,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    error: 'Limite de messages atteinte. Réessayez plus tard.',
  },
})

const MAX_HISTORY = 16
const MAX_MESSAGE_LENGTH = 1500

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((item) => item.content.length > 0)
}

router.post('/tutor/chat', ...withAiChatAccess, chatLimiter, async (req, res) => {
  try {
    const chapterId = String(req.body?.chapterId || '').trim()
    const courseId = String(req.body?.courseId || '').trim()
    const messages = normalizeMessages(req.body?.messages)

    if (!chapterId || !courseId) {
      return res.status(400).json({ success: false, error: 'Cours requis' })
    }
    if (messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Message requis' })
    }
    if (messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ success: false, error: 'Le dernier message doit venir de l’élève' })
    }

    const chapter = await Chapter.findOne({ _id: chapterId, published: true })
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = publishedCourses(chapter).find((item) => String(item._id) === courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    const modules = [...(course.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const courseContext = buildCourseContext({
      chapterName: chapter.name,
      courseTitle: course.title,
      modules,
    })
    const system = buildTutorSystemPrompt(courseContext)
    const reply = await createTutorReply({ system, messages })

    res.json({
      success: true,
      data: {
        message: {
          role: 'assistant',
          content: reply,
        },
      },
    })
  } catch (error) {
    const status = error.status || 500
    console.error('Erreur chat IA tuteur:', error)
    res.status(status).json({
      success: false,
      error: error.message || 'Chat IA indisponible',
    })
  }
})

export default router
