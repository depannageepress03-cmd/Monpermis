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

/* ------------------------------------------------------------------ */
/* Piège à pirates : signatures d'attaque évidentes → insulte + délai + bannissement   */
/* ------------------------------------------------------------------ */

const TAUNTS = [
  'Pauvre pirate de pacotille, retourne jouer avec ton scanner.',
  'Tu cherches quoi, bouffon ? Il n\'y a rien pour toi ici.',
  'Même mon grand-père pirate mieux que toi.',
  'Bravo, tu viens d\'être noté. Ton IP aussi.',
  'Piratin du dimanche : tes scripts d\'occasion ne passeront pas.',
  'Tu as copié ça sur un forum ? Ça se voit, nul.',
  'Tout est journalisé, génie. Va réviser tes cours de hacking.',
  'Ce système n\'est pas pour les amateurs dans ton genre.',
]

const SCANNER_PATHS =
  /(^|\/)(\.env|\.git|\.svn|\.aws|\.ssh|wp-admin|wp-login|wp-content|xmlrpc\.php|phpmyadmin|pma|adminer|admin\.php|config\.php|shell\.php|cgi-bin|actuator|vendor\/phpunit|server-status|\.DS_Store|etc\/passwd|boot\.ini)(\/|$|\?|\.)/i
const TRAVERSAL = /(\.\.\/|\.\.\\|%2e%2e(%2f|%5c)|%252e%252e)/i
const SQLI_QUERY = /(union(\s|\+|%20)+select|(\s|\+|%20)or(\s|\+|%20)+1(=|%3d)1|sleep\s*\(|benchmark\s*\(|information_schema|<script|%3cscript|javascript:)/i
const SCANNER_AGENTS = /(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wpscan|acunetix|nessus|hydra|havij|zgrab|nuclei)/i

const STRIKE_WINDOW_MS = 10 * 60 * 1000
const BAN_MS = 15 * 60 * 1000
const MAX_STRIKES = 8
const MAX_TRACKED_IPS = 5000
const strikes = new Map()
const bans = new Map()

function pickTaunt() {
  return TAUNTS[Math.floor(Math.random() * TAUNTS.length)]
}

function prune(map, now) {
  if (map.size < MAX_TRACKED_IPS) return
  for (const [key, value] of map) {
    if ((value.until ?? value.first + STRIKE_WINDOW_MS) < now) map.delete(key)
  }
  if (map.size >= MAX_TRACKED_IPS) map.clear() // plafond mémoire : mieux vaut oublier que gonfler
}

/** Signature d'attaque claire dans la requête (jamais envoyée par un vrai client). */
export function detectAttack(req) {
  const url = String(req.originalUrl || req.url || '')
  const agent = String(req.headers['user-agent'] || '')
  if (SCANNER_PATHS.test(url.split('?')[0])) return 'chemin de scanner'
  if (TRAVERSAL.test(url)) return 'traversée de répertoire'
  const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
  if (query && SQLI_QUERY.test(decodeURIComponent_safe(query))) return 'injection dans l\'URL'
  if (SCANNER_AGENTS.test(agent)) return 'outil de piratage'
  return null
}

function decodeURIComponent_safe(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function hasMongoOperators(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasMongoOperators(item, depth + 1))
  return Object.entries(value).some(
    ([key, inner]) => key.startsWith('$') || hasMongoOperators(inner, depth + 1),
  )
}

/** Enregistre la tentative ; renvoie true si l'IP vient d'être (ou est déjà) bannie. */
export function registerAttack(ip, reason, req, logger) {
  const now = Date.now()
  prune(strikes, now)
  const entry = strikes.get(ip)
  const current = entry && now - entry.first < STRIKE_WINDOW_MS ? entry : { first: now, count: 0 }
  current.count += 1
  strikes.set(ip, current)
  logger?.warn?.('Tentative de piratage détectée', {
    ip,
    reason,
    method: req.method,
    path: String(req.originalUrl || '').slice(0, 200),
    agent: String(req.headers['user-agent'] || '').slice(0, 120),
    strikes: current.count,
  })
  if (current.count >= MAX_STRIKES) {
    prune(bans, now)
    bans.set(ip, { until: now + BAN_MS })
    return true
  }
  return false
}

function taunt(res, status) {
  const message = pickTaunt()
  res.setHeader('X-Message-Au-Pirate', encodeURIComponent(message))
  res.setHeader('X-Powered-By', 'Ton-Echec')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json({ success: false, error: message })
}

/**
 * À monter tout en haut. Ne touche jamais une requête légitime : seules des signatures
 * d'attaque évidentes (chemins de scanners, traversée, injection d'URL, outils connus,
 * opérateurs NoSQL dans le corps — voir `rejectMongoOperators`) déclenchent la réponse.
 */
export function attackTrap(logger) {
  return (req, res, next) => {
    const now = Date.now()
    const ban = bans.get(req.ip)
    if (ban) {
      if (ban.until > now) return taunt(res, 403)
      bans.delete(req.ip)
    }
    const reason = detectAttack(req)
    if (!reason) return next()
    registerAttack(req.ip, reason, req, logger)
    // Délai volontaire : fait perdre du temps aux scanners automatiques.
    setTimeout(() => taunt(res, 404), 1500)
  }
}

/** Corps contenant des opérateurs `$…` : refus + insulte (un vrai client n'en envoie jamais). */
export function rejectMongoOperators(logger) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && hasMongoOperators(req.body)) {
      registerAttack(req.ip, 'injection NoSQL', req, logger)
      return taunt(res, 400)
    }
    return next()
  }
}

/** Réinitialisation pour les tests. */
export function _resetAttackState() {
  strikes.clear()
  bans.clear()
}
