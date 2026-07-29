/**
 * Sanitizeur HTML minimal pour le sous-ensemble TipTap des annonces
 * (p, br, strong/b, em/i, u, s, a, ul/ol/li, h2/h3). Pas de dépendance externe.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
])

function sanitizeHref(raw) {
  const href = String(raw || '').trim()
  if (!href) return ''
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href
  if (href.startsWith('/') && !href.startsWith('//')) return href
  return ''
}

/**
 * Retire scripts/styles et ne garde que les balises autorisées.
 * Les attributs hors `href`/`rel`/`target` sur `<a>` sont supprimés.
 */
export function sanitizeAnnouncementHtml(input) {
  let html = String(input ?? '')
  if (!html.trim()) return ''

  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(?:iframe|object|embed|form|input|button|textarea|select|meta|link|svg|math)[^>]*>/gi, '')

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tagName, attrs = '') => {
    const tag = String(tagName).toLowerCase()
    const closing = full.startsWith('</')
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (closing) return `</${tag}>`
    if (tag === 'br') return '<br>'
    if (tag === 'a') {
      const hrefMatch = attrs.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const href = sanitizeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '')
      if (!href) return '<span>'
      return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer" target="_blank">`
    }
    return `<${tag}>`
  })

  // Balances les <a> sans href convertis en <span>
  html = html.replace(/<span>([\s\S]*?)<\/a>/gi, '<span>$1</span>')

  return html.trim()
}

/** Texte brut pour notifications / compteur de caractères. */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value ?? ''))
}
