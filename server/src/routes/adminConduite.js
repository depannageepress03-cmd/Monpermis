import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ConduiteChapter, serializeModule } from '../models/ConduiteChapter.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { imageUpload } from '../middleware/upload.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '../../uploads/images')

fs.mkdirSync(uploadsDir, { recursive: true })

function nextOrder(items) {
  if (!items.length) return 0
  return Math.max(...items.map((item) => item.order ?? 0)) + 1
}

function cloneModules(modules) {
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .map((module, index) => ({
      name: module.name ? `${module.name} (copie)` : '',
      title: module.title || '',
      text: module.text || '',
      mediaType: module.mediaType || '',
      videoUrl: module.videoUrl || '',
      imageUrl: module.imageUrl || '',
      mediaBytes: module.mediaBytes || 0,
      order: index,
    }))
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
    mediaBytes = 0
  } else if (mediaType === 'image') {
    videoUrl = ''
  } else if (mediaType === '') {
    videoUrl = ''
    imageUrl = ''
    mediaBytes = 0
  }

  return { name, title, text, mediaType, videoUrl, imageUrl, mediaBytes }
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

router.use(requireAdminAuth)

router.get('/chapters', async (_req, res) => {
  try {
    const chapters = await ConduiteChapter.find().sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: { chapters: chapters.map((chapter) => chapter.toAdminJSON()) },
    })
  } catch (error) {
    console.error('Erreur liste chapitres:', error)
    res.status(500).json({ success: false, error: 'Impossible de charger les chapitres' })
  }
})

router.post('/chapters', async (req, res) => {
  try {
    const name = req.body.name?.trim()
    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, error: 'Nom de chapitre requis' })
    }

    const count = await ConduiteChapter.countDocuments()
    const chapter = await ConduiteChapter.create({ name, order: count, published: false })
    res.status(201).json({ success: true, data: { chapter: chapter.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur création chapitre:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (name.length < 2) {
        return res.status(400).json({ success: false, error: 'Nom de chapitre trop court' })
      }
      chapter.name = name
    }

    if (req.body.published !== undefined) {
      chapter.published = Boolean(req.body.published)
      if (chapter.published) {
        chapter.courses.forEach((course) => {
          course.published = true
        })
      }
    }

    await chapter.save()
    res.json({ success: true, data: { chapter: chapter.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur mise à jour chapitre:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/chapters/reorder', async (req, res) => {
  try {
    const orderedIds = req.body.orderedIds
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre invalide' })
    }

    const chapters = await ConduiteChapter.find()
    if (chapters.length !== orderedIds.length) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre incomplète' })
    }

    const byId = new Map(chapters.map((chapter) => [String(chapter._id), chapter]))
    if (orderedIds.some((id) => !byId.has(String(id)))) {
      return res.status(400).json({ success: false, error: 'Identifiant inconnu' })
    }

    await Promise.all(
      orderedIds.map((id, index) => {
        const chapter = byId.get(String(id))
        chapter.order = index
        return chapter.save()
      }),
    )

    const updated = await ConduiteChapter.find().sort({ order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: { chapters: updated.map((chapter) => chapter.toAdminJSON()) },
    })
  } catch (error) {
    console.error('Erreur réordonnancement chapitres:', error)
    res.status(500).json({ success: false, error: 'Réordonnancement impossible' })
  }
})

router.post('/chapters/:chapterId/duplicate', async (req, res) => {
  try {
    const source = await ConduiteChapter.findById(req.params.chapterId)
    if (!source) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const count = await ConduiteChapter.countDocuments()
    const duplicate = await ConduiteChapter.create({
      name: `${source.name} (copie)`,
      order: count,
      published: false,
      courses: [...source.courses]
        .sort((a, b) => a.order - b.order)
        .map((course, courseIndex) => ({
          title: course.title,
          order: courseIndex,
          published: false,
          modules: cloneModules(course.modules),
        })),
    })

    res.status(201).json({ success: true, data: { chapter: duplicate.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur duplication chapitre:', error)
    res.status(500).json({ success: false, error: 'Duplication impossible' })
  }
})

router.delete('/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findByIdAndDelete(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression chapitre:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/chapters/:chapterId/courses', async (req, res) => {
  try {
    const title = req.body.title?.trim()
    if (!title || title.length < 2) {
      return res.status(400).json({ success: false, error: 'Titre du cours requis' })
    }

    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    chapter.courses.push({
      title,
      order: nextOrder(chapter.courses),
      published: Boolean(chapter.published),
    })
    await chapter.save()

    const course = chapter.courses[chapter.courses.length - 1]
    res.status(201).json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          order: course.order,
          published: Boolean(course.published),
          modules: [],
        },
      },
    })
  } catch (error) {
    console.error('Erreur création cours:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/chapters/:chapterId/courses/:courseId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim()
      if (title.length < 2) {
        return res.status(400).json({ success: false, error: 'Titre trop court' })
      }
      course.title = title
    }

    if (req.body.published !== undefined) {
      course.published = Boolean(req.body.published)
    }

    await chapter.save()
    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          order: course.order,
          published: Boolean(course.published),
          modules: [...course.modules]
            .sort((a, b) => a.order - b.order)
            .map(serializeModule),
        },
      },
    })
  } catch (error) {
    console.error('Erreur mise à jour cours:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/chapters/:chapterId/courses/reorder', async (req, res) => {
  try {
    const orderedIds = req.body.orderedIds
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre invalide' })
    }

    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    if (!applyOrder(chapter.courses, orderedIds)) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre invalide' })
    }

    await chapter.save()
    res.json({ success: true, data: { chapter: chapter.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur réordonnancement cours:', error)
    res.status(500).json({ success: false, error: 'Réordonnancement impossible' })
  }
})

router.delete('/chapters/:chapterId/courses/:courseId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    course.deleteOne()
    await chapter.save()
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression cours:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/chapters/:chapterId/courses/:courseId/modules', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    const payload = normalizeMediaFields(req.body)
    course.modules.push({
      name: payload.name ?? '',
      title: payload.title ?? '',
      text: payload.text ?? '',
      mediaType: payload.mediaType ?? '',
      videoUrl: payload.videoUrl ?? '',
      imageUrl: payload.imageUrl ?? '',
      mediaBytes: payload.mediaBytes ?? 0,
      order: nextOrder(course.modules),
    })
    await chapter.save()

    const module = course.modules[course.modules.length - 1]
    res.status(201).json({
      success: true,
      data: { module: serializeModule(module) },
    })
  } catch (error) {
    console.error('Erreur création module:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.post('/chapters/:chapterId/courses/:courseId/modules/:moduleId/duplicate', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    const source = course.modules.id(req.params.moduleId)
    if (!source) {
      return res.status(404).json({ success: false, error: 'Module introuvable' })
    }

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
    await chapter.save()

    const module = course.modules[course.modules.length - 1]
    res.status(201).json({
      success: true,
      data: { module: serializeModule(module) },
    })
  } catch (error) {
    console.error('Erreur duplication module:', error)
    res.status(500).json({ success: false, error: 'Duplication impossible' })
  }
})

router.post('/chapters/:chapterId/courses/:courseId/modules/reorder', async (req, res) => {
  try {
    const orderedIds = req.body.orderedIds
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre invalide' })
    }

    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    if (!applyOrder(course.modules, orderedIds)) {
      return res.status(400).json({ success: false, error: 'Liste d’ordre invalide' })
    }

    await chapter.save()
    res.json({ success: true, data: { chapter: chapter.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur réordonnancement modules:', error)
    res.status(500).json({ success: false, error: 'Réordonnancement impossible' })
  }
})

router.patch('/chapters/:chapterId/courses/:courseId/modules/:moduleId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    const module = course.modules.id(req.params.moduleId)
    if (!module) {
      return res.status(404).json({ success: false, error: 'Module introuvable' })
    }

    const payload = normalizeMediaFields(req.body)
    if (payload.name !== undefined) module.name = payload.name
    if (payload.title !== undefined) module.title = payload.title
    if (payload.text !== undefined) module.text = payload.text
    if (payload.mediaType !== undefined) module.mediaType = payload.mediaType
    if (payload.videoUrl !== undefined) module.videoUrl = payload.videoUrl
    if (payload.imageUrl !== undefined) module.imageUrl = payload.imageUrl
    if (payload.mediaBytes !== undefined) module.mediaBytes = payload.mediaBytes

    if (module.mediaType === 'video') {
      module.imageUrl = ''
      module.mediaBytes = 0
    } else if (module.mediaType === 'image') {
      module.videoUrl = ''
    } else if (module.mediaType === '') {
      module.videoUrl = ''
      module.imageUrl = ''
      module.mediaBytes = 0
    }

    await chapter.save()

    res.json({
      success: true,
      data: { module: serializeModule(module) },
    })
  } catch (error) {
    console.error('Erreur mise à jour module:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/chapters/:chapterId/courses/:courseId/modules/:moduleId', async (req, res) => {
  try {
    const chapter = await ConduiteChapter.findById(req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    }

    const course = chapter.courses.id(req.params.courseId)
    if (!course) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' })
    }

    const module = course.modules.id(req.params.moduleId)
    if (!module) {
      return res.status(404).json({ success: false, error: 'Module introuvable' })
    }

    module.deleteOne()
    await chapter.save()
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Erreur suppression module:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/upload-image', (req, res) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucune image fournie' })
    }

    res.status(201).json({
      success: true,
      data: {
        imageUrl: `/uploads/images/${req.file.filename}`,
        mediaBytes: req.file.size || 0,
      },
    })
  })
})

export default router
