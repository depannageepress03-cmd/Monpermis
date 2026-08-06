import jwt from 'jsonwebtoken'
import { Moniteur } from '../models/Moniteur.js'

export async function requireMoniteurAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentification requise' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    if (payload.scope !== 'moniteur' || !payload.moniteurId) {
      return res.status(403).json({ success: false, error: 'Accès refusé' })
    }

    const moniteur = await Moniteur.findById(payload.moniteurId).select('+passwordHash')
    if (!moniteur || !moniteur.active) {
      return res.status(401).json({ success: false, error: 'Session invalide' })
    }
    if (!moniteur.activeLogin) {
      return res.status(403).json({
        success: false,
        error: 'Compte non activé, contactez l’administration',
        code: 'LOGIN_DISABLED',
      })
    }

    req.moniteur = moniteur
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' })
  }
}
