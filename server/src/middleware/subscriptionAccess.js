import { getUserAccess } from '../utils/subscriptions.js'

/**
 * @param {'code' | 'conduite' | 'eCodepermis'} feature
 */
export function requireSubscriptionAccess(feature) {
  return async function subscriptionGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise' })
      }

      const access = await getUserAccess(req.user._id)
      req.subscriptionAccess = access

      const allowed =
        feature === 'code'
          ? access.accessCode
          : feature === 'conduite'
            ? access.accessConduite
            : feature === 'eCodepermis'
              ? access.accessECodepermis
              : false

      if (!allowed) {
        const message = access.hasActiveSubscription
          ? 'Votre abonnement actuel ne donne pas accès à ce contenu. Souscrivez une offre adaptée.'
          : access.pendingSubscription
            ? 'Votre abonnement est en attente de validation du paiement par l’administration.'
            : 'Souscrivez un abonnement pour accéder à ce contenu.'

        return res.status(403).json({
          success: false,
          error: message,
          code: 'SUBSCRIPTION_REQUIRED',
          access,
        })
      }

      next()
    } catch (error) {
      console.error('Erreur contrôle abonnement:', error)
      return res.status(500).json({ success: false, error: 'Vérification abonnement impossible' })
    }
  }
}
