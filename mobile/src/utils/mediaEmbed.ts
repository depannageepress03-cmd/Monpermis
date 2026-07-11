/**
 * Convertit une URL vidéo en source d’affichage sans jamais l’exposer à l’UI.
 */

function extractYoutubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return id.split('?')[0] || null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
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

export function resolveVideoEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)

    const youtubeId = extractYoutubeId(parsed)
    if (youtubeId) {
      const params = new URLSearchParams({
        playsinline: '1',
        rel: '0',
        modestbranding: '1',
        enablejsapi: '1',
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
  } catch {
    // URL relative ou invalide : lecture directe
  }

  return { kind: 'video', src: trimmed }
}

/** HTML plein écran pour charger un embed de façon fiable dans un WebView mobile. */
export function buildEmbedHtml(src: string): string {
  const safeSrc = src.replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #0b1220;
      overflow: hidden;
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      background: #0b1220;
    }
  </style>
</head>
<body>
  <iframe
    src="${safeSrc}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
</body>
</html>`
}
