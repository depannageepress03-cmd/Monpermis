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

function contentAudioPath(chapterOrder: number, questionOrder: number, rawUrl?: string | null) {
  const value = String(rawUrl || '').trim()
  // Garde le ?v=… de l’API (même URL que l’admin).
  if (value && /code-audio\/chapitre-\d+\/\d+\.mp3/i.test(value) && !/^(local|asset|file):\/\//i.test(value)) {
    return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : `/${value}`
  }
  return `/content/code-audio/chapitre-${chapterOrder}/${questionOrder}.mp3`
}

/**
 * Même source que l’admin : `/content/code-audio/...`.
 * En local (origin vide) → chemin relatif (proxy Vite `/content`).
 * Bundle = secours offlineOnly / si pas d’URL réseau.
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
    if (offlineOnly) {
      const bundled = getBundledCodeAudioUrl(chapterOrder, questionOrder)
      return bundled && isUsableBundledUrl(bundled) ? bundled : ''
    }

    // 1) URL API (identique admin) — relative en local = proxy Vite
    const apiPath = contentAudioPath(chapterOrder, questionOrder, url)
    const apiUrl = resolveMediaUrl(apiPath)
    if (apiUrl) return apiUrl

    // 2) Bundle embarqué
    const bundled = getBundledCodeAudioUrl(chapterOrder, questionOrder)
    if (bundled && isUsableBundledUrl(bundled)) return bundled
    return ''
  }

  if (offlineOnly) return ''
  const value = String(url || '').trim()
  if (!value || /^(local|asset|file):\/\//i.test(value)) return ''
  return resolveMediaUrl(value) || ''
}
