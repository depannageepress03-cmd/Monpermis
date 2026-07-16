import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export async function requireUserAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentification requise' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    if (payload.scope === 'admin' || !payload.userId) {
      return res.status(403).json({ success: false, error: 'Accès refusé' })
    }

    const user = await User.findById(payload.userId)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session invalide' })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu. Contactez l’administration.',
      })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' })
  }
}
