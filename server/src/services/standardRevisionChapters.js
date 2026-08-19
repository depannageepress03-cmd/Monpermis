import { listStandardRevisionChapters } from '../data/standardRevisionChapters.js'
import { Chapter } from '../models/Chapter.js'
import { logger } from '../utils/logger.js'

/**
 * Garantit les 19 chapitres standards (ordre 1…19, noms « Chapitre N »).
 * Ne supprime pas d’éventuels chapitres hors catalogue.
 */
export async function ensureStandardRevisionChapters() {
  const catalog = listStandardRevisionChapters()
  let created = 0
  let updated = 0

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

  return { created, updated, total: catalog.length }
}

export async function ensureStandardRevisionChaptersSafe() {
  try {
    const result = await ensureStandardRevisionChapters()
    if (result.created || result.updated) {
      logger.info('Chapitres révision standards synchronisés', result)
    }
    return result
  } catch (error) {
    logger.error('Sync chapitres standards', { error: error?.message || error })
    return null
  }
}
