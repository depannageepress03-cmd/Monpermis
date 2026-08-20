import { getBundledCodeImageUrl } from '../data/codeRoute/imageUrls'
import { resolveMediaUrl } from './mediaUrl'

function parseCodeImagePath(url: string): { chapterOrder: number; imageIndex: number } | null {
  const local = String(url || '').match(/^local:\/\/code-image\/(\d+)\/(\d+)\.png$/i)
  if (local) return { chapterOrder: Number(local[1]), imageIndex: Number(local[2]) }
  const remote = String(url || '').match(/code-images\/chapitre-(\d+)\/(\d+)\.(?:png|jpe?g|webp)/i)
  if (remote) return { chapterOrder: Number(remote[1]), imageIndex: Number(remote[2]) }
  return null
}

function isUsableBundledUrl(href: string): boolean {
  if (!href) return false
  // new URL(..., import.meta.url) mal résolu → file:// hors du bundle Vite
  if (/^file:/i.test(href)) return false
  return true
}

/** Image embarquée en priorité, sinon URL API. */
export function resolveCodeImageUrl(url?: string | null): string {
  if (!url?.trim()) return ''
  const parsed = parseCodeImagePath(url)
  if (parsed) {
    const bundled = getBundledCodeImageUrl(parsed.chapterOrder, parsed.imageIndex)
    if (bundled && isUsableBundledUrl(bundled)) return bundled
    // Fallback API /content si le bundle est cassé ou absent
    return resolveMediaUrl(
      `/content/code-images/chapitre-${parsed.chapterOrder}/${parsed.imageIndex}.png`,
    )
  }
  if (/^local:\/\//i.test(url)) return ''
  return resolveMediaUrl(url)
}
