/** Convertit une URL vidéo en source d’affichage sans jamais l’exposer à l’UI. */

function normalizeVideoInput(url: string): string {
  let trimmed = url.trim()
  if (!trimmed) return ''

  // Colle parfois sans schéma : "www.youtube.com/watch?v=…"
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith('/')) {
    trimmed = `https://${trimmed}`
  }
  return trimmed
}

function extractYoutubeId(url: URL): string | null {
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

function extractVimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '')
  if (!host.endsWith('vimeo.com')) return null

  const parts = url.pathname.split('/').filter(Boolean)
  const id = parts.find((part) => /^\d+$/.test(part))
  return id ?? null
}

function isYoutubeOrVimeoHost(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, '')
  return (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('vimeo.com')
  )
}

export function resolveVideoEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const trimmed = normalizeVideoInput(url)
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)

    const youtubeId = extractYoutubeId(parsed)
    if (youtubeId) {
      const params = new URLSearchParams({
        playsinline: '1',
        rel: '0',
        modestbranding: '1',
      })
      return {
        kind: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`,
      }
    }

    const vimeoId = extractVimeoId(parsed)
    if (vimeoId) {
      return {
        kind: 'iframe',
        src: `https://player.vimeo.com/video/${vimeoId}?playsinline=1&title=0&byline=0`,
      }
    }

    // Lien YouTube/Vimeo non reconnu → ne pas basculer sur <video> (injouable)
    if (isYoutubeOrVimeoHost(parsed)) {
      return null
    }
  } catch {
    // URL relative ou invalide : lecture directe
  }

  return { kind: 'video', src: trimmed }
}
