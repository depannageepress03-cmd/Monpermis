import { AuditLog } from '../models/AuditLog.js'

export function audit(action, resource) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      if (res.statusCode < 400 && req.admin) {
        AuditLog.create({
          adminId: req.admin._id,
          adminName: req.admin.fullName || 'Admin',
          action,
          resource: typeof resource === 'function' ? resource(req) : resource,
          resourceId: req.params?.userId || req.params?.id,
          details: { method: req.method, path: req.originalUrl, body: sanitize(req.body) },
          ip: req.ip || req.headers['x-forwarded-for'],
        }).catch(() => {})
      }
      return originalJson(body)
    }
    next()
  }
}

function sanitize(body) {
  if (!body) return undefined
  const safe = { ...body }
  delete safe.password
  delete safe.confirmPassword
  delete safe.currentPassword
  delete safe.token
  return safe
}
