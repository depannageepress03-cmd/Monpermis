import jwt from 'jsonwebtoken'
import { Admin } from '../models/Admin.js'

let superAdminExistsCache = { value: null, checkedAt: 0 }
const SUPERADMIN_CACHE_MS = 60_000

/** True si au moins un compte `superadmin` actif existe (cache court). */
export async function hasActiveSuperAdmin() {
  const now = Date.now()
  if (
    superAdminExistsCache.value != null &&
    now - superAdminExistsCache.checkedAt < SUPERADMIN_CACHE_MS
  ) {
    return superAdminExistsCache.value
  }
  const count = await Admin.countDocuments({ role: 'superadmin', isActive: true })
  superAdminExistsCache = { value: count > 0, checkedAt: now }
  return superAdminExistsCache.value
}

export function invalidateSuperAdminCache() {
  superAdminExistsCache = { value: null, checkedAt: 0 }
}

export async function requireAdminAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentification requise' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    if (payload.scope !== 'admin' || !payload.adminId) {
      return res.status(403).json({ success: false, error: 'Accès refusé' })
    }

    const admin = await Admin.findById(payload.adminId)
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, error: 'Session invalide' })
    }

    req.admin = admin
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' })
  }
}

/**
 * Réservé aux superadmins : gestion des admins, journal d’audit, finances.
 * Tant qu’aucun superadmin actif n’existe (migration), tout admin authentifié
 * conserve l’accès — le bootstrap (SUPERADMIN_PHONE / seed) active ensuite le filtre.
 */
export async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Authentification requise' })
    }
    const gated = await hasActiveSuperAdmin()
    if (gated && req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux super-administrateurs',
      })
    }
    return next()
  } catch {
    return res.status(500).json({ success: false, error: 'Vérification des droits impossible' })
  }
}
