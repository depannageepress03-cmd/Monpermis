import { Asset } from 'expo-asset'
import { getCodeImageModule } from '../data/codeRoute/imageAssets'
import { findLocalQuestionById, parseLocalQuestionId } from '../data/codeRoute/banks'
import { resolveMediaUrl } from './mediaUrl'

const uriCache = new Map<string, string>()

function parseLocalImageRef(url: string): { chapterOrder: number; imageIndex: number } | null {
  const local = String(url || '').match(/^local:\/\/code-image\/(\d+)\/(\d+)\.png$/i)
  if (local) return { chapterOrder: Number(local[1]), imageIndex: Number(local[2]) }
  const remote = String(url || '').match(/code-images\/chapitre-(\d+)\/(\d+)\.(?:png|jpe?g|webp)/i)
  if (remote) return { chapterOrder: Number(remote[1]), imageIndex: Number(remote[2]) }
  return null
}

/** URI locale embarquée ou URL réseau pour une image d’énoncé. */
export async function resolveQuestionImageUri(
  questionId: string | null | undefined,
  imageUrl: string,
): Promise<string | undefined> {
  const localRef = parseLocalImageRef(imageUrl)
  const localQ = questionId ? findLocalQuestionById(questionId) : null
  const parsed = questionId ? parseLocalQuestionId(questionId) : null
  const chapterOrder = localRef?.chapterOrder || localQ?.chapterOrder || parsed?.chapterOrder
  const imageIndex = localRef?.imageIndex

  if (chapterOrder && imageIndex) {
    const cacheKey = `${chapterOrder}:${imageIndex}`
    const cached = uriCache.get(cacheKey)
    if (cached) return cached

    const mod = getCodeImageModule(chapterOrder, imageIndex)
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

    return resolveMediaUrl(`/content/code-images/chapitre-${chapterOrder}/${imageIndex}.png`)
  }

  if (/^local:\/\//i.test(imageUrl)) return undefined
  return resolveMediaUrl(imageUrl)
}
