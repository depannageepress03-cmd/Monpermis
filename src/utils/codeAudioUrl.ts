import { getBundledCodeAudioUrl } from '../data/codeRoute/audioUrls'
import { parseLocalQuestionId } from '../data/codeRoute/banks'
import { resolveMediaUrl } from './mediaUrl'

function parseCodeAudioRef(
  url?: string | null,
): { chapterOrder: number; questionOrder: number } | null {
  const value = String(url || '').trim()
  if (!value) return null
  const local = value.match(/^local:\/\/code-audio\/(\d+)\/(\d+)\.mp3$/i)
  if (local) return { chapterOrder: Number(local[1]), questionOrder: Number(local[2]) }
  const content = value.match(/code-audio\/chapitre-(\d+)\/(\d+)\.mp3/i)
  if (content) return { chapterOrder: Number(content[1]), questionOrder: Number(content[2]) }
  return null
}

function isUsableBundledUrl(href: string): boolean {
  if (!href) return false
  if (/^file:/i.test(href)) return false
  return true
}

/**
 * Audio embarqué en priorité, sinon `/content/code-audio/...` via l’API.
 * Aligné sur resolveCodeImageUrl — ne laisse plus `local://` muet.
 */
export function resolveCodeAudioUrl(
  url?: string | null,
  options?: { questionKey?: string; offlineOnly?: boolean },
): string {
  const offlineOnly = Boolean(options?.offlineOnly)
  const fromUrl = parseCodeAudioRef(url)
  const fromKey = options?.questionKey ? parseLocalQuestionId(options.questionKey) : null
  const chapterOrder = fromUrl?.chapterOrder || fromKey?.chapterOrder
  const questionOrder = fromUrl?.questionOrder || fromKey?.questionOrder

  if (chapterOrder && questionOrder) {
    const bundled = getBundledCodeAudioUrl(chapterOrder, questionOrder)
    if (bundled && isUsableBundledUrl(bundled)) return bundled
    if (offlineOnly) return ''
    return resolveMediaUrl(
      `/content/code-audio/chapitre-${chapterOrder}/${questionOrder}.mp3`,
    )
  }

  if (offlineOnly) return ''
  const value = String(url || '').trim()
  if (!value || /^(local|asset|file):\/\//i.test(value)) return ''
  return resolveMediaUrl(value) || ''
}
