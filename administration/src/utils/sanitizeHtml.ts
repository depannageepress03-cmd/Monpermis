import DOMPurify from 'dompurify'

// Liens ouverts hors de l'espace admin : jamais de window.opener.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** HTML riche (annonces, cours) nettoyé avant tout rendu : pas de script, de handler on*, d'iframe ni de javascript:. */
export function sanitizeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(String(html ?? ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'base', 'link', 'meta'],
    FORBID_ATTR: ['style'],
  })
}
