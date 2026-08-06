import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { RevisionCourse } from '../models/RevisionCourse.js'
import { serializeModule } from '../models/BaseChapter.js'
import {
  ensureNotionsHaveChapter,
  ensureStandaloneRevisionCourses,
  ensureUnsortedChapter,
} from '../services/migrateRevisionCourses.js'
import { ensureStandardRevisionChapters } from '../services/standardRevisionChapters.js'
import { Chapter } from '../models/Chapter.js'

const router = Router()
router.use(requireAdminAuth)

/** Prépare le catalogue : chapitres standards + notions toutes rattachées. */
async function ensureCatalog() {
  await ensureStandaloneRevisionCourses()
  await ensureStandardRevisionChapters()
  await ensureNotionsHaveChapter()
}

/** Résout le chapitre cible d'une notion, avec repli sur le chapitre tampon. */
async function resolveChapter(chapterId) {
  if (chapterId) {
    const chapter = await Chapter.findById(chapterId)
    if (chapter) return chapter
    return null
  }
  return ensureUnsortedChapter()
}

function nextOrder(items) {
  if (!items.length) return 0
  return Math.max(...items.map((item) => item.order ?? 0)) + 1
}

function applyOrder(items, orderedIds) {
  const byId = new Map(items.map((item) => [String(item._id), item]))
  if (orderedIds.length !== items.length || orderedIds.some((id) => !byId.has(String(id)))) {
    return false
  }
  orderedIds.forEach((id, index) => {
    byId.get(String(id)).order = index
  })
  return true
}

function normalizeMediaFields(body) {
  const name = body.name !== undefined ? String(body.name).trim() : undefined
  const title = body.title !== undefined ? String(body.title).trim() : undefined
  const text = body.text !== undefined ? String(body.text).trim() : undefined
  let mediaType = body.mediaType !== undefined ? String(body.mediaType).trim() : undefined
  if (mediaType && mediaType !== 'video' && mediaType !== 'image') mediaType = ''

  let videoUrl = body.videoUrl !== undefined ? String(body.videoUrl).trim() : undefined
  let imageUrl = body.imageUrl !== undefined ? String(body.imageUrl).trim() : undefined
  let mediaBytes = body.mediaBytes !== undefined ? Number(body.mediaBytes) || 0 : undefined

  if (mediaType === 'video') {
    imageUrl = ''
  } else if (mediaType === 'image') {
    videoUrl = ''
  } else if (mediaType === '') {
    videoUrl = ''
    imageUrl = ''
    mediaBytes = 0
  }

  return { name, title, text, mediaType, videoUrl, imageUrl, mediaBytes }
}

router.get('/courses', audit('list', 'course'), async (req, res) => {
  try {
    await ensureCatalog()
    const filter = {}
    const chapterId = String(req.query?.chapterId || '').trim()
    if (chapterId) filter.chapter = chapterId

    const [courses, chapters] = await Promise.all([
      RevisionCourse.find(filter).sort({ order: 1, createdAt: 1 }),
      Chapter.find().sort({ order: 1, createdAt: 1 }).select('name order published'),
    ])

    res.json({
      success: true,
      data: {
        courses: courses.map((course) => course.toAdminJSON()),
        chapters: chapters.map((chapter) => ({
          id: String(chapter._id),
          name: chapter.name,
          order: chapter.order,
          published: Boolean(chapter.published),
        })),
      },
    })
  } catch (error) {
    console.error('Erreur liste cours:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/courses', audit('create', 'course'), async (req, res) => {
  try {
    await ensureCatalog()
    const title = String(req.body?.title || '').trim()
    if (title.length < 2) {
      return res.status(400).json({ success: false, error: 'Titre requis (2 caractères min.)' })
    }
    const chapter = await resolveChapter(String(req.body?.chapterId || '').trim())
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }
    const count = await RevisionCourse.countDocuments({ chapter: chapter._id })
    const course = await RevisionCourse.create({
      title,
      chapter: chapter._id,
      order: count,
      published: false,
      modules: [],
    })
    res.status(201).json({ success: true, data: { course: course.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur création cours:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/courses/:courseId', audit('update', 'course'), async (req, res) => {
  try {
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })

    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim()
      if (title.length < 2) {
        return res.status(400).json({ success: false, error: 'Titre invalide' })
      }
      course.title = title
    }
    if (req.body?.published !== undefined) {
      course.published = Boolean(req.body.published)
    }
    if (req.body?.chapterId !== undefined) {
      const target = await resolveChapter(String(req.body.chapterId || '').trim())
      if (!target) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }
      if (String(target._id) !== String(course.chapter || '')) {
        // Placée en fin de liste du chapitre d'arrivée.
        course.order = await RevisionCourse.countDocuments({ chapter: target._id })
        course.chapter = target._id
      }
    }
    await course.save()
    res.json({ success: true, data: { course: course.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur mise à jour cours:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/courses/reorder', audit('reorder', 'course'), async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map(String) : []
    const chapterId = String(req.body?.chapterId || '').trim()
    const filter = chapterId ? { chapter: chapterId } : {}
    const courses = await RevisionCourse.find(filter)
    if (!applyOrder(courses, orderedIds)) {
      return res.status(400).json({ success: false, error: 'Ordre invalide' })
    }
    await Promise.all(courses.map((course) => course.save()))
    const next = await RevisionCourse.find(filter).sort({ order: 1, createdAt: 1 })
    res.json({ success: true, data: { courses: next.map((c) => c.toAdminJSON()) } })
  } catch (error) {
    console.error('Erreur réordonnancement cours:', error)
    res.status(500).json({ success: false, error: 'Réordonnancement impossible' })
  }
})

router.delete('/courses/:courseId', audit('delete', 'course'), async (req, res) => {
  try {
    const course = await RevisionCourse.findByIdAndDelete(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression cours:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/courses/:courseId/modules', audit('create', 'module'), async (req, res) => {
  try {
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })

    const fields = normalizeMediaFields(req.body ?? {})
    course.modules.push({
      name: fields.name || '',
      title: fields.title || '',
      text: fields.text || '',
      mediaType: fields.mediaType || '',
      videoUrl: fields.videoUrl || '',
      imageUrl: fields.imageUrl || '',
      mediaBytes: fields.mediaBytes || 0,
      order: nextOrder(course.modules),
    })
    await course.save()
    const mod = course.modules[course.modules.length - 1]
    res.status(201).json({ success: true, data: { module: serializeModule(mod) } })
  } catch (error) {
    console.error('Erreur création module:', error)
    res.status(500).json({ success: false, error: 'Ajout impossible' })
  }
})

router.post(
  '/courses/:courseId/modules/:moduleId/duplicate',
  audit('duplicate', 'module'),
  async (req, res) => {
    try {
      const course = await RevisionCourse.findById(req.params.courseId)
      if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })
      const source = course.modules.id(req.params.moduleId)
      if (!source) return res.status(404).json({ success: false, error: 'Module introuvable' })

      course.modules.push({
        name: source.name ? `${source.name} (copie)` : '',
        title: source.title || '',
        text: source.text || '',
        mediaType: source.mediaType || '',
        videoUrl: source.videoUrl || '',
        imageUrl: source.imageUrl || '',
        mediaBytes: source.mediaBytes || 0,
        order: nextOrder(course.modules),
      })
      await course.save()
      const mod = course.modules[course.modules.length - 1]
      res.status(201).json({ success: true, data: { module: serializeModule(mod) } })
    } catch (error) {
      console.error('Erreur duplication module:', error)
      res.status(500).json({ success: false, error: 'Duplication impossible' })
    }
  },
)

router.post('/courses/:courseId/modules/reorder', audit('reorder', 'module'), async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map(String) : []
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })
    if (!applyOrder(course.modules, orderedIds)) {
      return res.status(400).json({ success: false, error: 'Ordre invalide' })
    }
    await course.save()
    res.json({ success: true, data: { course: course.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur réordonnancement modules:', error)
    res.status(500).json({ success: false, error: 'Réordonnancement impossible' })
  }
})

router.patch('/courses/:courseId/modules/:moduleId', audit('update', 'module'), async (req, res) => {
  try {
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })
    const mod = course.modules.id(req.params.moduleId)
    if (!mod) return res.status(404).json({ success: false, error: 'Module introuvable' })

    const fields = normalizeMediaFields(req.body ?? {})
    if (fields.name !== undefined) mod.name = fields.name
    if (fields.title !== undefined) mod.title = fields.title
    if (fields.text !== undefined) mod.text = fields.text
    if (fields.mediaType !== undefined) mod.mediaType = fields.mediaType
    if (fields.videoUrl !== undefined) mod.videoUrl = fields.videoUrl
    if (fields.imageUrl !== undefined) mod.imageUrl = fields.imageUrl
    if (fields.mediaBytes !== undefined) mod.mediaBytes = fields.mediaBytes

    await course.save()
    res.json({ success: true, data: { module: serializeModule(mod) } })
  } catch (error) {
    console.error('Erreur mise à jour module:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/courses/:courseId/modules/:moduleId', audit('delete', 'module'), async (req, res) => {
  try {
    const course = await RevisionCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ success: false, error: 'Cours introuvable' })
    const mod = course.modules.id(req.params.moduleId)
    if (!mod) return res.status(404).json({ success: false, error: 'Module introuvable' })
    mod.deleteOne()
    await course.save()
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression module:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

export default router
