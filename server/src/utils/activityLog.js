import { ActivityEvent } from '../models/ActivityEvent.js'
import { broadcastActivityEvent } from '../services/activityEvents.js'

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

function sanitizeValue(value, depth = 0) {
  if (value == null) return value
  if (depth > 4) return '[…]'
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeValue(item, depth + 1))
  }
  if (typeof value !== 'object') return value
  const safe = {}
  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_KEYS.has(key) || /password|secret|token|authorization/i.test(key)) {
      safe[key] = '[redacted]'
      continue
    }
    safe[key] = sanitizeValue(raw, depth + 1)
  }
  return safe
}

function clientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req?.ip || req?.socket?.remoteAddress || undefined
}

function clientUserAgent(req) {
  const ua = req?.headers?.['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 500) : undefined
}

/**
 * Enregistre + diffuse une activité (fire-and-forget).
 *
 * @param {{
 *   actorType: 'admin'|'user'|'system',
 *   actorId?: string|null,
 *   actorName?: string,
 *   action: string,
 *   resource: string,
 *   resourceId?: string|null,
 *   summary?: string,
 *   severity?: 'info'|'success'|'warning'|'danger',
 *   metadata?: Record<string, unknown>,
 *   req?: import('express').Request,
 * }} options
 */
export function logActivity(options = {}) {
  const {
    actorType = 'system',
    actorId = null,
    actorName = '',
    action,
    resource,
    resourceId = null,
    summary = '',
    severity = 'info',
    metadata,
    req,
  } = options

  if (!action || !resource) return Promise.resolve(null)

  const doc = {
    actorType,
    actorId: actorId != null ? String(actorId) : null,
    actorName: String(actorName || '').slice(0, 120),
    action: String(action).slice(0, 80),
    resource: String(resource).slice(0, 80),
    resourceId: resourceId != null ? String(resourceId).slice(0, 80) : null,
    summary: String(summary || '').slice(0, 400),
    severity,
    metadata: metadata ? sanitizeValue(metadata) : undefined,
    ip: req ? clientIp(req) : undefined,
    userAgent: req ? clientUserAgent(req) : undefined,
  }

  return ActivityEvent.create(doc)
    .then((created) => {
      const json = created.toPublicJSON()
      broadcastActivityEvent({ type: 'activity', activity: json })
      return created
    })
    .catch(() => null)
}

/** Raccourci activité admin (depuis req.admin). */
export function logAdminActivity(req, options = {}) {
  const admin = options.admin || req?.admin
  return logActivity({
    ...options,
    actorType: 'admin',
    actorId: admin?._id ? String(admin._id) : options.actorId,
    actorName: admin?.fullName || options.actorName || 'Admin',
    req,
  })
}

/** Raccourci activité apprenant. */
export function logUserActivity(req, options = {}) {
  const user = options.user || req?.user
  const name =
    options.actorName ||
    (user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.phone || 'Apprenant'
      : 'Apprenant')
  return logActivity({
    ...options,
    actorType: 'user',
    actorId: user?._id ? String(user._id) : options.actorId,
    actorName: name,
    req,
  })
}
