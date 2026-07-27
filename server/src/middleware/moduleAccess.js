import { getUserModuleAccess } from '../utils/accessRequests.js'

/**
 * @param {'code' | 'conduite_videos' | 'ecodepermis' | 'aiChat'} module
 */
export function requireModuleAccess(module) {
  return async function moduleAccessGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise' })
      }

      const access = await getUserModuleAccess(req.user._id)
      req.moduleAccess = access

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
