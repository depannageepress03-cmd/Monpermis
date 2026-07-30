import { getBundledCodeImageUrl } from '../data/codeRoute/imageUrls'
import { resolveMediaUrl } from './mediaUrl'

function parseCodeImagePath(url: string): { chapterOrder: number; imageIndex: number } | null {
  const local = String(url || '').match(/^local:\/\/code-image\/(\d+)\/(\d+)\.png$/i)
  if (local) return { chapterOrder: Number(local[1]), imageIndex: Number(local[2]) }
  const remote = String(url || '').match(/code-images\/chapitre-(\d+)\/(\d+)\.(?:png|jpe?g|webp)/i)
  if (remote) return { chapterOrder: Number(remote[1]), imageIndex: Number(remote[2]) }
  return null
}

/** Image embarquée en priorité, sinon URL API. */
export function resolveCodeImageUrl(url?: string | null): string {
  if (!url?.trim()) return ''
  const parsed = parseCodeImagePath(url)
  if (parsed) {
    const bundled = getBundledCodeImageUrl(parsed.chapterOrder, parsed.imageIndex)
    if (bundled) return bundled
  }
  if (/^local:\/\//i.test(url)) return ''
  return resolveMediaUrl(url)
}
