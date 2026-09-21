const DANGEROUS_TAGS =
  'script|iframe|object|embed|svg|math|style|form|button|input|select|textarea|option|' +
  'details|dialog|video|audio|source|track|link|meta|base|frame|frameset|canvas|applet|marquee'

const URL_ATTRS = 'href|src|srcset|poster|background|xlink:href|formaction'

function cleanUrlAttribute(attr: string, value: string): string {
  const quote = value[0] === '"' || value[0] === "'" ? value[0] : ''
  const raw = quote ? value.slice(1, -1) : value
  // Neutralise les obfuscations (entités HTML, contrôles/tabulations).
  const decoded = raw
    .replace(/&#[xX]?[0-9a-fA-F]+;?/g, ' ')
    .replace(/[\u0000-\u0020]+/g, '')
  if (/^(javascript|data|vbscript|file|blob):/i.test(decoded)) return ''
  if (/^\/\//.test(decoded)) return ''
  return ` ${attr}=${quote}${raw}${quote}`
}

/**
 * Assainit le HTML CMS avant RenderHTML (React Native, sans DOM).
 * Supprime les tags dangereux, les handlers d'événements, les attributs
 * style et les schémas d'URL à risque (y compris obfusqués).
 */
export function sanitizeCmsHtml(html: string): string {
  if (!html) return ''
  let out = html
  // Blocs dangereux complets (avec leur contenu).
  out = out.replace(
    new RegExp(`<(${DANGEROUS_TAGS})[\\s>][\\s\\S]*?<\\/\\1\\s*>`, 'gi'),
    '',
  )
  // Tags dangereux orphelins restants.
  out = out.replace(new RegExp(`<\\/?(${DANGEROUS_TAGS})[^>]*>`, 'gi'), '')
  // Handlers on* (onclick, onerror, onload…), avec ou sans guillemets.
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // Attributs style (expression(), url(data:…), exfiltration).
  out = out.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // Schémas d'URL à risque dans href/src/… (javascript:, data:, //hôte).
  out = out.replace(
    new RegExp(`\\s(${URL_ATTRS})\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'gi'),
    (_m, attr, value) => cleanUrlAttribute(attr, value),
  )
  return out
}
