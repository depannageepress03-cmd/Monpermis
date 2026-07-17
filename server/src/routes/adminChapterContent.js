import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { imageUpload, writeFile } from '../middleware/upload.js'

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

export function createAdminChapterRouter(Model) {
  const router = Router()
  router.use(requireAdminAuth)

  router.get('/chapters', async (_req, res) => {
    try {
      const chapters = await Model.find().sort({ order: 1, createdAt: 1 })
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

      const count = await Model.countDocuments()
      const chapter = await Model.create({ name, order: count, published: false })
      res.status(201).json({ success: true, data: { chapter: chapter.toAdminJSON() } })
    } catch (error) {
      console.error('Erreur cr\u00e9ation chapitre:', error)
      res.status(500).json({ success: false, error: 'Cr\u00e9ation impossible' })
    }
  })

  router.patch('/chapters/:chapterId', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
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
      console.error('Erreur mise \u00e0 jour chapitre:', error)
      res.status(500).json({ success: false, error: 'Mise \u00e0 jour impossible' })
    }
  })

  router.post('/chapters/reorder', async (req, res) => {
    try {
      const orderedIds = req.body.orderedIds
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre invalide' })
      }

      const chapters = await Model.find()
      if (chapters.length !== orderedIds.length) {
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre incompl\u00e8te' })
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

      const updated = await Model.find().sort({ order: 1, createdAt: 1 })
      res.json({
        success: true,
        data: { chapters: updated.map((chapter) => chapter.toAdminJSON()) },
      })
    } catch (error) {
      console.error('Erreur r\u00e9ordonnancement chapitres:', error)
      res.status(500).json({ success: false, error: 'R\u00e9ordonnancement impossible' })
    }
  })

  router.post('/chapters/:chapterId/duplicate', async (req, res) => {
    try {
      const source = await Model.findById(req.params.chapterId)
      if (!source) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }

      const count = await Model.countDocuments()
      const duplicate = await Model.create({
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
      const chapter = await Model.findByIdAndDelete(req.params.chapterId)
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

      const chapter = await Model.findById(req.params.chapterId)
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
      console.error('Erreur cr\u00e9ation cours:', error)
      res.status(500).json({ success: false, error: 'Cr\u00e9ation impossible' })
    }
  })

  router.patch('/chapters/:chapterId/courses/:courseId', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
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
              .map((m) => ({
                id: m._id,
                name: m.name || '',
                title: m.title || '',
                text: m.text || '',
                mediaType: m.mediaType || '',
                videoUrl: m.mediaType === 'video' ? m.videoUrl || '' : '',
                imageUrl: m.mediaType === 'image' ? m.imageUrl || '' : '',
                mediaBytes: m.mediaBytes || 0,
                order: m.order,
              })),
          },
        },
      })
    } catch (error) {
      console.error('Erreur mise \u00e0 jour cours:', error)
      res.status(500).json({ success: false, error: 'Mise \u00e0 jour impossible' })
    }
  })

  router.post('/chapters/:chapterId/courses/reorder', async (req, res) => {
    try {
      const orderedIds = req.body.orderedIds
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre invalide' })
      }

      const chapter = await Model.findById(req.params.chapterId)
      if (!chapter) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }

      if (!applyOrder(chapter.courses, orderedIds)) {
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre invalide' })
      }

      await chapter.save()
      res.json({ success: true, data: { chapter: chapter.toAdminJSON() } })
    } catch (error) {
      console.error('Erreur r\u00e9ordonnancement cours:', error)
      res.status(500).json({ success: false, error: 'R\u00e9ordonnancement impossible' })
    }
  })

  router.delete('/chapters/:chapterId/courses/:courseId', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
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
      const chapter = await Model.findById(req.params.chapterId)
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

      const mod = course.modules[course.modules.length - 1]
      res.status(201).json({
        success: true,
        data: {
          module: {
            id: mod._id,
            name: mod.name || '',
            title: mod.title || '',
            text: mod.text || '',
            mediaType: mod.mediaType || '',
            videoUrl: mod.mediaType === 'video' ? mod.videoUrl || '' : '',
            imageUrl: mod.mediaType === 'image' ? mod.imageUrl || '' : '',
            mediaBytes: mod.mediaBytes || 0,
            order: mod.order,
          },
        },
      })
    } catch (error) {
      console.error('Erreur cr\u00e9ation module:', error)
      res.status(500).json({ success: false, error: 'Cr\u00e9ation impossible' })
    }
  })

  router.post('/chapters/:chapterId/courses/:courseId/modules/:moduleId/duplicate', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
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

      const mod = course.modules[course.modules.length - 1]
      res.status(201).json({
        success: true,
        data: {
          module: {
            id: mod._id,
            name: mod.name || '',
            title: mod.title || '',
            text: mod.text || '',
            mediaType: mod.mediaType || '',
            videoUrl: mod.mediaType === 'video' ? mod.videoUrl || '' : '',
            imageUrl: mod.mediaType === 'image' ? mod.imageUrl || '' : '',
            mediaBytes: mod.mediaBytes || 0,
            order: mod.order,
          },
        },
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
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre invalide' })
      }

      const chapter = await Model.findById(req.params.chapterId)
      if (!chapter) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }

      const course = chapter.courses.id(req.params.courseId)
      if (!course) {
        return res.status(404).json({ success: false, error: 'Cours introuvable' })
      }

      if (!applyOrder(course.modules, orderedIds)) {
        return res.status(400).json({ success: false, error: 'Liste d\u2019ordre invalide' })
      }

      await chapter.save()
      res.json({ success: true, data: { chapter: chapter.toAdminJSON() } })
    } catch (error) {
      console.error('Erreur r\u00e9ordonnancement modules:', error)
      res.status(500).json({ success: false, error: 'R\u00e9ordonnancement impossible' })
    }
  })

  router.patch('/chapters/:chapterId/courses/:courseId/modules/:moduleId', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
      if (!chapter) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }

      const course = chapter.courses.id(req.params.courseId)
      if (!course) {
        return res.status(404).json({ success: false, error: 'Cours introuvable' })
      }

      const mod = course.modules.id(req.params.moduleId)
      if (!mod) {
        return res.status(404).json({ success: false, error: 'Module introuvable' })
      }

      const payload = normalizeMediaFields(req.body)
      if (payload.name !== undefined) mod.name = payload.name
      if (payload.title !== undefined) mod.title = payload.title
      if (payload.text !== undefined) mod.text = payload.text
      if (payload.mediaType !== undefined) mod.mediaType = payload.mediaType
      if (payload.videoUrl !== undefined) mod.videoUrl = payload.videoUrl
      if (payload.imageUrl !== undefined) mod.imageUrl = payload.imageUrl
      if (payload.mediaBytes !== undefined) mod.mediaBytes = payload.mediaBytes

      if (mod.mediaType === 'video') {
        mod.imageUrl = ''
        mod.mediaBytes = 0
      } else if (mod.mediaType === 'image') {
        mod.videoUrl = ''
      } else if (mod.mediaType === '') {
        mod.videoUrl = ''
        mod.imageUrl = ''
        mod.mediaBytes = 0
      }

      await chapter.save()

      res.json({
        success: true,
        data: {
          module: {
            id: mod._id,
            name: mod.name || '',
            title: mod.title || '',
            text: mod.text || '',
            mediaType: mod.mediaType || '',
            videoUrl: mod.mediaType === 'video' ? mod.videoUrl || '' : '',
            imageUrl: mod.mediaType === 'image' ? mod.imageUrl || '' : '',
            mediaBytes: mod.mediaBytes || 0,
            order: mod.order,
          },
        },
      })
    } catch (error) {
      console.error('Erreur mise \u00e0 jour module:', error)
      res.status(500).json({ success: false, error: 'Mise \u00e0 jour impossible' })
    }
  })

  router.delete('/chapters/:chapterId/courses/:courseId/modules/:moduleId', async (req, res) => {
    try {
      const chapter = await Model.findById(req.params.chapterId)
      if (!chapter) {
        return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      }

      const course = chapter.courses.id(req.params.courseId)
      if (!course) {
        return res.status(404).json({ success: false, error: 'Cours introuvable' })
      }

      const mod = course.modules.id(req.params.moduleId)
      if (!mod) {
        return res.status(404).json({ success: false, error: 'Module introuvable' })
      }

      mod.deleteOne()
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

      try {
        const saved = writeFile(req.file)
        res.status(201).json({
          success: true,
          data: {
            imageUrl: `/uploads/images/${saved.filename}`,
            mediaBytes: saved.size,
          },
        })
      } catch (err) {
        return res.status(err.status || 400).json({
          success: false,
          error: err.message || 'Enregistrement image impossible',
        })
      }
    })
  })

  return router
}
