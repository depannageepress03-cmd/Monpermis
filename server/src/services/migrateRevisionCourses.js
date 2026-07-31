import { Chapter } from '../models/Chapter.js'
import { RevisionCourse } from '../models/RevisionCourse.js'
import { logger } from '../utils/logger.js'

/**
 * Migre une fois les cours embarqués dans les chapitres vers la collection autonome.
 * Conserve les _id pour ne pas casser la progression apprenant.
 */
export async function ensureStandaloneRevisionCourses() {
  const existing = await RevisionCourse.countDocuments()
  if (existing > 0) return { migrated: false, count: existing }

  const chapters = await Chapter.find({}).select('courses name')
  let created = 0
  let order = 0

  for (const chapter of chapters) {
    const courses = [...(chapter.courses || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const course of courses) {
      const payload = {
        _id: course._id,
        title: course.title || `Cours ${order + 1}`,
        order,
        published: Boolean(course.published),
        modules: [...(course.modules || [])].map((mod) => ({
          _id: mod._id,
          name: mod.name || '',
          title: mod.title || '',
          text: mod.text || '',
          mediaType: mod.mediaType || '',
          videoUrl: mod.videoUrl || '',
          imageUrl: mod.imageUrl || '',
          mediaBytes: mod.mediaBytes || 0,
          order: mod.order ?? 0,
        })),
      }
      try {
        await RevisionCourse.create(payload)
        created += 1
        order += 1
      } catch (error) {
        if (error?.code === 11000) continue
        throw error
      }
    }
    chapter.courses = []
    await chapter.save()
  }

  if (created > 0) {
    logger.info(`Migration cours autonomes: ${created} cours migrés depuis les chapitres`)
  }

  return { migrated: true, count: created }
}
