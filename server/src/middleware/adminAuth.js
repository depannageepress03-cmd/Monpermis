import jwt from 'jsonwebtoken'
import { Admin } from '../models/Admin.js'

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
