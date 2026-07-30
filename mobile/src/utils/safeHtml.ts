import { dark, fonts } from '../theme'
import { sanitizeCmsHtml } from './sanitizeHtml'

export { sanitizeCmsHtml }

/** Tags HTML autorisés pour le contenu CMS (cours / actualités). */
export const SAFE_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'a',
  'span',
] as const

export const safeHtmlTagsStyles = {
  p: {
    marginTop: 0,
    marginBottom: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: dark.textPrimary,
  },
  h2: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    marginBottom: 8,
    color: dark.textPrimary,
  },
  h3: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    marginBottom: 6,
    color: dark.textPrimary,
  },
  strong: { fontFamily: fonts.bodyBold },
  b: { fontFamily: fonts.bodyBold },
  em: { fontStyle: 'italic' as const },
  u: { textDecorationLine: 'underline' as const },
  s: { textDecorationLine: 'line-through' as const },
  a: { color: dark.green, textDecorationLine: 'underline' as const },
  ul: { marginBottom: 10, paddingLeft: 18 },
  ol: { marginBottom: 10, paddingLeft: 18 },
  li: { marginBottom: 4 },
}
