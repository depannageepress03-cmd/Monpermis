import crypto from 'node:crypto'

/**
 * Durcissement transverse de l'API (admin, moniteur, apprenants).
 */

const MIN_JWT_SECRET_LENGTH = 32

/** Refuse de démarrer en production avec un secret JWT absent ou faible. */
export function assertProductionSecrets(env = process.env) {
  if (env.NODE_ENV !== 'production') return
  const secret = String(env.JWT_SECRET || '')
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET trop court (minimum ${MIN_JWT_SECRET_LENGTH} caractères en production)`)
  }
}

/** Un jeton émis avant le dernier changement de mot de passe n'est plus valable. */
export function isTokenRevoked(payload, passwordChangedAt) {
  if (!passwordChangedAt) return false
  const changedAtSec = Math.floor(new Date(passwordChangedAt).getTime() / 1000)
  return !payload?.iat || payload.iat < changedAtSec
}

/** Hash bcrypt (coût 12) d'une valeur aléatoire jetée : égalise le temps de réponse d'un compte inexistant. */
export const DUMMY_BCRYPT_HASH = '$2b$12$upOVanko7H4CGyHS5y3RdeFLzW6cOZe2F//gs5vog5EaPY7oW5vHy'

function isDangerousKey(key) {
  return key.startsWith('$') || key.includes('.')
}

/** Retire récursivement les clés `$…` / `a.b` (injection d'opérateurs NoSQL). */
export function stripMongoOperators(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => stripMongoOperators(item, depth + 1))
  const clean = {}
  for (const [key, inner] of Object.entries(value)) {
    if (isDangerousKey(key)) continue
    clean[key] = stripMongoOperators(inner, depth + 1)
  }
  return clean
}

export function sanitizeMongoInput(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = stripMongoOperators(req.body)
  }
  // Express 5 : req.query est un getter — on remplace via defineProperty.
  if (req.query && typeof req.query === 'object') {
    const clean = stripMongoOperators({ ...req.query })
    Object.defineProperty(req, 'query', { value: clean, writable: true, configurable: true })
  }
  next()
}

/**
 * Réponses JSON de l'API : jamais mises en cache, jamais interprétées comme page,
 * jamais affichables dans une frame.
 */
export function apiResponseHeaders(req, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  next()
}

export function permissionsPolicy(_req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  next()
}

/** Compare deux secrets en temps constant. */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}
