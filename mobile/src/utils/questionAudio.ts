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

export type ResolvedPromptAudio = {
  /** Module `require(...)` embarqué — préféré pour expo-audio. */
  module?: number
  /** URI fichier local ou URL https. */
  uri?: string
}

/** Source audio embarquée (module) ou, sauf offlineOnly, URL réseau. */
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

  if (chapterOrder && questionOrder) {
    const cacheKey = `${chapterOrder}:${questionOrder}`
    const cached = uriCache.get(cacheKey)
    if (cached) return { uri: cached }

    const mod = getCodeAudioModule(chapterOrder, questionOrder)
    if (mod != null) {
      try {
        const asset = Asset.fromModule(mod)
        await asset.downloadAsync()
        const uri = asset.localUri || asset.uri
        if (uri) {
          uriCache.set(cacheKey, uri)
          return { module: mod, uri }
        }
        return { module: mod }
      } catch {
        return { module: mod }
      }
    }

    if (offlineOnly) return undefined
    const uri = resolveMediaUrl(
      `/content/code-audio/chapitre-${chapterOrder}/${questionOrder}.mp3`,
    )
    return uri ? { uri } : undefined
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
