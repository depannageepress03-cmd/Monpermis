import { AuditLog } from '../models/AuditLog.js'

const SECRET_KEYS = new Set([
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'jwt',
  'authorization',
])

/**
 * Retire les champs sensibles d’un objet (récursif, profondeur limitée).
 */
export function sanitizeAuditValue(value, depth = 0) {
  if (value == null) return value
  if (depth > 4) return '[…]'
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeAuditValue(item, depth + 1))
  }
  if (typeof value !== 'object') return value

  const safe = {}
  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_KEYS.has(key) || /password|secret|token|authorization/i.test(key)) {
      safe[key] = '[redacted]'
      continue
    }
    safe[key] = sanitizeAuditValue(raw, depth + 1)
  }
  return safe
}

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || undefined
}

function clientUserAgent(req) {
  const ua = req.headers?.['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 500) : undefined
}

function resolveResourceId(req, explicit) {
  if (explicit != null && explicit !== '') return String(explicit)
  const params = req.params || {}
  return (
    params.userId ||
    params.id ||
    params.adminId ||
    params.chapterId ||
    params.questionId ||
    params.examId ||
    params.subjectId ||
    params.moduleId ||
    params.courseId ||
    params.key ||
    undefined
  )
}

/**
 * Journalise une action admin (fire-and-forget).
 * Ne jamais y passer de mots de passe / tokens en clair.
 *
 * @param {import('express').Request} req
 * @param {{
 *   action: string,
 *   resource: string,
 *   resourceId?: string,
 *   metadata?: Record<string, unknown>,
 *   before?: unknown,
 *   after?: unknown,
 *   admin?: { _id: unknown, fullName?: string },
 * }} options
 */
export function logAdminAction(req, options = {}) {
  const admin = options.admin || req.admin
  if (!admin?._id) return Promise.resolve(null)

  const metadata = sanitizeAuditValue({
    ...(options.metadata && typeof options.metadata === 'object' ? options.metadata : {}),
    ...(options.before !== undefined ? { before: options.before } : {}),
    ...(options.after !== undefined ? { after: options.after } : {}),
    method: req.method,
    path: req.originalUrl || req.url,
  })

  return AuditLog.create({
    adminId: admin._id,
    adminName: admin.fullName || 'Admin',
    action: String(options.action || 'unknown'),
    resource: String(options.resource || 'unknown'),
    resourceId: resolveResourceId(req, options.resourceId),
    metadata,
    details: metadata,
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
  }).catch(() => null)
}

/**
 * Middleware Express : journalise après une réponse JSON réussie (< 400).
 *
 * @param {string} action
 * @param {string | ((req: import('express').Request) => string)} resource
 * @param {{ resourceId?: (req: import('express').Request) => string, metadata?: (req: import('express').Request, body: unknown) => object }} [opts]
 */
export function audit(action, resource, opts = {}) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = function auditedJson(body) {
      if (res.statusCode < 400 && req.admin) {
        const resolvedResource = typeof resource === 'function' ? resource(req) : resource
        const resourceId =
          typeof opts.resourceId === 'function' ? opts.resourceId(req) : resolveResourceId(req)
        const extraMeta =
          typeof opts.metadata === 'function' ? opts.metadata(req, body) : opts.metadata

        logAdminAction(req, {
          action,
          resource: resolvedResource,
          resourceId,
          metadata: {
            ...(extraMeta && typeof extraMeta === 'object' ? extraMeta : {}),
            requestBody: sanitizeAuditValue(req.body),
            responseSummary: summarizeResponse(body),
          },
        })
      }
      return originalJson(body)
    }
    next()
  }
}

function summarizeResponse(body) {
  if (!body || typeof body !== 'object') return undefined
  const data = body.data
  if (!data || typeof data !== 'object') return { success: body.success }
  const keys = Object.keys(data).slice(0, 8)
  const summary = { success: body.success, keys }
  for (const key of keys) {
    const value = data[key]
    if (value && typeof value === 'object' && 'id' in value) {
      summary[`${key}Id`] = value.id
    }
  }
  return summary
}
