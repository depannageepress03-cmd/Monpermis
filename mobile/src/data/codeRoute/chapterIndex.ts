import type { RevisionChapter } from '../../api/revision'
import { listStandardChapterShells } from './standardChapters'

const byId = new Map<string, { order: number; name: string }>()

export function indexRevisionChapters(chapters: RevisionChapter[]) {
  byId.clear()
  for (const chapter of chapters) {
    byId.set(String(chapter.id), {
      order: Number(chapter.order) || 0,
      name: chapter.name,
    })
  }
}

export function getChapterOrderById(chapterId: string): number | null {
  const order = byId.get(String(chapterId))?.order
  if (order && order > 0) return order
  const local = String(chapterId || '').match(/^local-ch-(\d+)$/)
  return local ? Number(local[1]) : null
}

/** Mémorise l’ordre (ex. depuis les params de navigation). */
export function rememberChapterOrder(chapterId: string, order?: number | null, name?: string) {
  const n = Number(order)
  if (!chapterId || !Number.isFinite(n) || n < 1) return
  const prev = byId.get(String(chapterId))
  byId.set(String(chapterId), {
    order: n,
    name: name || prev?.name || `Chapitre ${n}`,
  })
}

/** Fusionne l’API avec le catalogue 1…20 (toujours 20 entrées). */
export function mergeWithStandardChapters(apiChapters: RevisionChapter[]): RevisionChapter[] {
  const byOrder = new Map<number, RevisionChapter>()
  for (const chapter of apiChapters) {
    const order = Number(chapter.order)
    if (order >= 1 && order <= 20) byOrder.set(order, chapter)
  }

  const merged = listStandardChapterShells().map((shell) => {
    const api = byOrder.get(shell.order)
    if (api) return api
    return {
      id: shell.id,
      name: shell.name,
      order: shell.order,
      courses: [],
    }
  })

  indexRevisionChapters(merged)
  return merged
}
