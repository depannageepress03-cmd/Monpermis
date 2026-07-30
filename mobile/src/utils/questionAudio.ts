import { Asset } from 'expo-asset'
import { getCodeAudioModule } from '../data/codeRoute/audioAssets'
import { findLocalQuestionById, parseLocalQuestionId } from '../data/codeRoute/banks'
import { resolveMediaUrl } from './mediaUrl'

const uriCache = new Map<string, string>()

/** URI locale (fichier embarqué) ou URL réseau pour l’énoncé. */
export async function resolveQuestionPromptUri(
  questionId?: string | null,
  remoteAudioUrl?: string | null,
): Promise<string | undefined> {
  const localQ = questionId ? findLocalQuestionById(questionId) : null
  const parsed = questionId ? parseLocalQuestionId(questionId) : null
  const chapterOrder = localQ?.chapterOrder || parsed?.chapterOrder
  const questionOrder = localQ?.order || parsed?.questionOrder

  if (chapterOrder && questionOrder) {
    const cacheKey = `${chapterOrder}:${questionOrder}`
    const cached = uriCache.get(cacheKey)
    if (cached) return cached

    const mod = getCodeAudioModule(chapterOrder, questionOrder)
    if (mod != null) {
      try {
        const asset = Asset.fromModule(mod)
        await asset.downloadAsync()
        const uri = asset.localUri || asset.uri
        if (uri) {
          uriCache.set(cacheKey, uri)
          return uri
        }
      } catch {
        // fallback réseau
      }
    }
  }

  return resolveMediaUrl(remoteAudioUrl)
}
