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

export const UNSORTED_CHAPTER_NAME = 'À classer'

/**
 * Chapitre tampon qui accueille les notions pas encore rangées.
 * Ordre 0 et non publié : invisible côté élève (le catalogue filtre les ordres 1…N),
 * visible côté admin pour être vidé progressivement.
 */
export async function ensureUnsortedChapter() {
  const existing = await Chapter.findOne({ name: UNSORTED_CHAPTER_NAME })
  if (existing) return existing
  return Chapter.create({
    name: UNSORTED_CHAPTER_NAME,
    order: 0,
    published: false,
    courses: [],
  })
}

/**
 * Rattache au chapitre tampon toute notion encore orpheline.
 * Idempotent : ne crée le chapitre tampon que s'il reste des notions à classer.
 */
export async function ensureNotionsHaveChapter() {
  const orphanFilter = { $or: [{ chapter: null }, { chapter: { $exists: false } }] }
  const orphanCount = await RevisionCourse.countDocuments(orphanFilter)
  if (orphanCount === 0) return { assigned: 0 }

  const chapter = await ensureUnsortedChapter()
  const result = await RevisionCourse.updateMany(orphanFilter, {
    $set: { chapter: chapter._id },
  })
  const assigned = result.modifiedCount ?? 0
  if (assigned > 0) {
    logger.info(`Notions sans chapitre: ${assigned} rattachée(s) au chapitre « ${UNSORTED_CHAPTER_NAME} »`)
  }
  return { assigned, chapterId: String(chapter._id) }
}
