import {
  STANDARD_REVISION_CHAPTER_COUNT,
  listStandardRevisionChapters,
} from '../data/standardRevisionChapters.js'
import { Chapter } from '../models/Chapter.js'
import { RevisionCourse } from '../models/RevisionCourse.js'
import { logger } from '../utils/logger.js'

/**
 * Garantit les chapitres standards (ordre 1…N, noms « Chapitre N »).
 * Supprime les chapitres hors catalogue (ex. ancien chapitre 20).
 */
export async function ensureStandardRevisionChapters() {
  const catalog = listStandardRevisionChapters()
  let created = 0
  let updated = 0
  let removed = 0

  for (const item of catalog) {
    const existing = await Chapter.findOne({
      $or: [
        { order: item.order },
        { name: new RegExp(`^chapitre\\s*#?\\s*${item.order}\\b`, 'i') },
        { name: new RegExp(`^${item.order}([\\s.\\-–:]|$)`) },
      ],
    })

    if (!existing) {
      await Chapter.create({
        name: item.name,
        order: item.order,
        published: true,
        courses: [],
      })
      created += 1
      continue
    }

    let dirty = false
    if (existing.order !== item.order) {
      existing.order = item.order
      dirty = true
    }
    if (String(existing.name || '').trim() !== item.name) {
      existing.name = item.name
      dirty = true
    }
    // Les 19 chapitres standards sont toujours visibles côté élève.
    if (!existing.published) {
      existing.published = true
      dirty = true
    }
    if (dirty) {
      await existing.save()
      updated += 1
    }
  }

  const extras = await Chapter.find({
    order: { $gt: STANDARD_REVISION_CHAPTER_COUNT },
  })
  for (const extra of extras) {
    await RevisionCourse.updateMany(
      { chapter: extra._id },
      { $set: { chapter: null } },
    )
    await extra.deleteOne()
    removed += 1
  }

  return { created, updated, removed, total: catalog.length }
}

export async function ensureStandardRevisionChaptersSafe() {
  try {
    const result = await ensureStandardRevisionChapters()
    if (result.created || result.updated || result.removed) {
      logger.info('Chapitres révision standards synchronisés', result)
    }
    return result
  } catch (error) {
    logger.error('Sync chapitres standards', { error: error?.message || error })
    return null
  }
}
