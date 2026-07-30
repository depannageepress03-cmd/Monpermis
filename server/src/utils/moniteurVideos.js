/**
 * URLs vidéo autorisées pour les profils moniteurs (YouTube / Vimeo uniquement).
 */

function normalizeVideoInput(url) {
  let trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith('/')) {
    trimmed = `https://${trimmed}`
  }
  return trimmed
}

function extractYoutubeId(url) {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return id.split('?')[0] || null
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const fromQuery = url.searchParams.get('v')
    if (fromQuery) return fromQuery

    const parts = url.pathname.split('/').filter(Boolean)
    const marker = parts.findIndex((part) =>
      ['embed', 'shorts', 'live', 'v'].includes(part),
    )
    if (marker >= 0 && parts[marker + 1]) {
      return parts[marker + 1].split('?')[0]
    }
  }

  return null
}

function extractVimeoId(url) {
  const host = url.hostname.replace(/^www\./, '')
  if (!host.endsWith('vimeo.com')) return null
  const parts = url.pathname.split('/').filter(Boolean)
  return parts.find((part) => /^\d+$/.test(part)) ?? null
}

export function isAllowedMoniteurVideoUrl(raw) {
  const trimmed = normalizeVideoInput(raw)
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    return Boolean(extractYoutubeId(parsed) || extractVimeoId(parsed))
  } catch {
    return false
  }
}

export function filterAllowedMoniteurVideos(rawList, max = 6) {
  if (!Array.isArray(rawList)) return []
  const out = []
  for (const item of rawList) {
    const url = String(item || '').trim()
    if (!url || !isAllowedMoniteurVideoUrl(url)) continue
    if (!out.includes(url)) out.push(url)
    if (out.length >= max) break
  }
  return out
}
