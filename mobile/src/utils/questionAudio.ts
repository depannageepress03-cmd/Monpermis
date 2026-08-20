import { Asset } from 'expo-asset'
import { getCodeAudioModule } from '../data/codeRoute/audioAssets'
import { findLocalQuestionById, parseLocalQuestionId } from '../data/codeRoute/banks'
import { resolveMediaUrl } from './mediaUrl'

const uriCache = new Map<string, string>()

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

export type ResolvePromptAudioOptions = {
  /** Si true : jamais d’URL réseau (examens / hors-ligne). */
  offlineOnly?: boolean
}

/** True si un MP3 embarqué existe pour cette question. */
export function hasBundledQuestionAudio(
  questionId?: string | null,
  audioUrl?: string | null,
): boolean {
  const localQ = questionId ? findLocalQuestionById(questionId) : null
  const parsed = questionId ? parseLocalQuestionId(questionId) : null
  const fromUrl = parseCodeAudioRef(audioUrl)
  const chapterOrder = fromUrl?.chapterOrder || localQ?.chapterOrder || parsed?.chapterOrder
  const questionOrder = fromUrl?.questionOrder || localQ?.order || parsed?.questionOrder
  if (!chapterOrder || !questionOrder) return false
  return getCodeAudioModule(chapterOrder, questionOrder) != null
}

function contentAudioPath(chapterOrder: number, questionOrder: number, rawUrl?: string | null) {
  const value = String(rawUrl || '').trim()
  if (value && /code-audio\/chapitre-\d+\/\d+\.mp3/i.test(value) && !/^(local|asset|file):\/\//i.test(value)) {
    return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : `/${value}`
  }
  return `/content/code-audio/chapitre-${chapterOrder}/${questionOrder}.mp3`
}

export type ResolvedPromptAudio = {
  /** Module `require(...)` embarqué — secours hors-ligne. */
  module?: number
  /** URI = même source que l’admin (`/content/code-audio/...`). */
  uri?: string
}

/**
 * En ligne : même URL que l’admin (API `/content/code-audio/...`).
 * Hors-ligne / offlineOnly : module embarqué.
 */
export async function resolveQuestionPromptSource(
  questionId?: string | null,
  remoteAudioUrl?: string | null,
  options: ResolvePromptAudioOptions = {},
): Promise<ResolvedPromptAudio | undefined> {
  const offlineOnly = Boolean(options.offlineOnly)
  const localQ = questionId ? findLocalQuestionById(questionId) : null
  const parsed = questionId ? parseLocalQuestionId(questionId) : null
  const fromUrl = parseCodeAudioRef(remoteAudioUrl)
  const chapterOrder = fromUrl?.chapterOrder || localQ?.chapterOrder || parsed?.chapterOrder
  const questionOrder = fromUrl?.questionOrder || localQ?.order || parsed?.questionOrder

  const mod =
    chapterOrder && questionOrder ? getCodeAudioModule(chapterOrder, questionOrder) : null

  if (!offlineOnly && chapterOrder && questionOrder) {
    const uri = resolveMediaUrl(contentAudioPath(chapterOrder, questionOrder, remoteAudioUrl))
    if (uri) return { uri, module: mod ?? undefined }
  }

  if (chapterOrder && questionOrder && mod != null) {
    const cacheKey = `${chapterOrder}:${questionOrder}`
    const cached = uriCache.get(cacheKey)
    if (cached) return { module: mod, uri: cached }
    try {
      const asset = Asset.fromModule(mod)
      await asset.downloadAsync()
      const uri = asset.localUri || asset.uri
      if (uri) {
        uriCache.set(cacheKey, uri)
        return { module: mod, uri }
      }
    } catch {
      // ignore
    }
    return { module: mod }
  }

  if (offlineOnly) return undefined
  if (/^(local|asset|file):\/\//i.test(String(remoteAudioUrl || ''))) return undefined
  const uri = resolveMediaUrl(remoteAudioUrl)
  return uri ? { uri } : undefined
}

/** URI locale (fichier embarqué) ou, sauf offlineOnly, URL réseau. */
export async function resolveQuestionPromptUri(
  questionId?: string | null,
  remoteAudioUrl?: string | null,
  options: ResolvePromptAudioOptions = {},
): Promise<string | undefined> {
  const source = await resolveQuestionPromptSource(questionId, remoteAudioUrl, options)
  return source?.uri
}
