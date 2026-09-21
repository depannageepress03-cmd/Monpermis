import crypto from 'crypto'

/** Comparaison à temps constant d'une clé API (anti timing-oracle). */
export function isCronApiKeyValid(provided) {
  const expected = String(process.env.CRON_API_KEY || '')
  const actual = String(provided || '')
  if (!expected || !actual) return false
  const a = crypto.createHash('sha256').update(actual).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

/** SHA-256 hex d'un buffer/string (clé d'idempotence de repli webhook). */
export function sha256Hex(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data ?? ''))
  return crypto.createHash('sha256').update(buf).digest('hex')
}

const DEV_HTTP_HOSTS = /^(127\.0\.0\.1|localhost|10\.0\.2\.2)(:\d+)?\//i

/**
 * Assainit une URL stockée (photo/vidéo CMS, liens moniteur).
 * Accepte : https://, http://localhost (dev), chemins relatifs et noms simples.
 * Rejette : javascript:, data:, vbscript:, file:, blob:, //hôte,
 * backslashes, chevrons/guillemets/espaces (vecteurs XSS stocké via href/src).
 */
export function sanitizeStoredUrl(value) {
  const v = String(value ?? '').trim()
  if (!v || v.length > 2048) return ''
  if (/[\s<>"'`\\]/.test(v)) return ''
  if (v.startsWith('//')) return ''
  const scheme = v.match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase()
  if (scheme) {
    if (scheme === 'https') return v
    if (scheme === 'http' && DEV_HTTP_HOSTS.test(v.slice(7))) return v
    return ''
  }
  return v
}
