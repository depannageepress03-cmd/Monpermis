/**
 * URL affichable (photo, lien) : https, ou chemin du site.
 * Refuse javascript:, data:, et les URLs protocol-relative.
 */
export function sanitizePublicUrl(raw, max = 500) {
  const url = String(raw || '').trim().slice(0, max)
  if (!url) return ''
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !/[\s<>"']/.test(url)) {
    return url
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return ''
    if (parsed.username || parsed.password) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export function sanitizePublicUrlList(raw, maxItems = 12, maxLen = 500) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    const url = sanitizePublicUrl(item, maxLen)
    if (!url || out.includes(url)) continue
    out.push(url)
    if (out.length >= maxItems) break
  }
  return out
}
