import { getUserModuleAccess } from '../utils/accessRequests.js'

// Accès déjà accordé : gardé 20 s par utilisateur et module pour éviter 3-4 requêtes base à chaque appel.
// Seuls les accès accordés sont mis en cache : un achat est donc pris en compte immédiatement,
// et une expiration au plus 20 s plus tard.
const GRANTED_TTL_MS = 20_000
const grantedCache = new Map()

function grantedKey(userId, module) {
  return `${String(userId)}:${module}`
}

/**
 * @param {'code' | 'conduite_videos' | 'aiChat'} module
 */
export function requireModuleAccess(module) {
  return async function moduleAccessGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise' })
      }

      const key = grantedKey(req.user._id, module)
      const granted = grantedCache.get(key)
      if (granted && Date.now() < granted.expiresAt) {
        req.moduleAccess = granted.access
        return next()
      }

      const access = await getUserModuleAccess(req.user._id)
      req.moduleAccess = access
      if (access.access[module]) {
        if (grantedCache.size > 5000) grantedCache.clear()
        grantedCache.set(key, { access, expiresAt: Date.now() + GRANTED_TTL_MS })
      } else {
        grantedCache.delete(key)
      }

      if (!access.access[module]) {
        const message = access.pendingRequest
          ? 'Votre demande d’accès est en cours de vérification.'
          : 'Achetez l’accès à ce module pour continuer.'

        return res.status(403).json({
          success: false,
          error: message,
          code: 'ACCESS_REQUIRED',
          access,
        })
      }

      next()
    } catch (error) {
      console.error('Erreur contrôle accès module:', error)
      return res.status(500).json({ success: false, error: 'Vérification accès impossible' })
    }
  }
}
