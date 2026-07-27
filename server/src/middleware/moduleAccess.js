import { getUserModuleAccess } from '../utils/accessRequests.js'
import { getUserAccess as getLegacySubscriptionAccess } from '../utils/subscriptions.js'

const LEGACY_FLAG_BY_MODULE = {
  code: 'accessCode',
  conduite_videos: 'accessConduite',
  ecodepermis: 'accessECodepermis',
  aiChat: 'accessAiChat',
}

/**
 * Porte double pendant la transition : accès accordé si une AccessRequest active
 * existe (nouveau système) OU si l'abonnement legacy (UserSubscription) donne
 * encore le droit correspondant (utilisateurs déjà abonnés, laissés s'éteindre
 * naturellement — voir le plan de migration).
 *
 * @param {'code' | 'conduite_videos' | 'ecodepermis' | 'aiChat'} module
 */
export function requireModuleAccess(module) {
  return async function moduleAccessGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise' })
      }

      const [newAccess, legacyAccess] = await Promise.all([
        getUserModuleAccess(req.user._id),
        getLegacySubscriptionAccess(req.user._id),
      ])

      const legacyFlag = LEGACY_FLAG_BY_MODULE[module]
      const allowed = Boolean(newAccess.access[module]) || Boolean(legacyFlag && legacyAccess[legacyFlag])

      req.moduleAccess = { new: newAccess, legacy: legacyAccess }

      if (!allowed) {
        const message = newAccess.pendingRequest
          ? 'Votre demande d’accès est en cours de vérification.'
          : legacyAccess.pendingSubscription
            ? 'Votre abonnement est en attente de validation du paiement par l’administration.'
            : 'Achetez l’accès à ce module pour continuer.'

        return res.status(403).json({
          success: false,
          error: message,
          code: 'ACCESS_REQUIRED',
          access: newAccess,
        })
      }

      next()
    } catch (error) {
      console.error('Erreur contrôle accès module:', error)
      return res.status(500).json({ success: false, error: 'Vérification accès impossible' })
    }
  }
}
