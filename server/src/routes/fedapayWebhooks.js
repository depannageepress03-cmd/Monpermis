import { Router } from 'express'
import { constructFedaPayEvent, mapFedaPayStatus } from '../services/fedapay.js'
import {
  applyApprovedAccessPayment,
  applyFailedAccessPayment,
  findPaymentFromFedaEvent,
} from '../utils/accessRequests.js'
import {
  applyApprovedPayment as applyApprovedLegacyPayment,
  applyFailedPayment as applyFailedLegacyPayment,
  findPaymentFromFedaEvent as findLegacyPaymentFromFedaEvent,
} from '../utils/payments.js'

const router = Router()

/**
 * Un seul endpoint pour FedaPay. On cherche d'abord côté nouveau système
 * (Payment/AccessRequest) ; si absent, on retombe sur l'ancien système
 * (PaymentTransaction/UserSubscription) pour les paiements déjà en vol au
 * moment de la bascule — voir la note de migration dans le plan.
 */
router.post('/', async (req, res) => {
  const signature = req.headers['x-fedapay-signature']
  let event

  try {
    event = constructFedaPayEvent(req.body, signature)
  } catch (error) {
    console.error('Webhook FedaPay signature invalide:', error.message)
    return res.status(400).json({ success: false, error: error.message })
  }

  const eventName = event?.name || event?.type || ''
  const eventId = String(event?.id || `${eventName}:${event?.entity?.id || event?.object?.id || ''}`)
  const object = event?.entity || event?.object || event?.data?.object || {}

  try {
    const payment = await findPaymentFromFedaEvent(object)
    const applyApproved = payment ? applyApprovedAccessPayment : applyApprovedLegacyPayment
    const applyFailed = payment ? applyFailedAccessPayment : applyFailedLegacyPayment
    const legacyPayment = payment ? null : await findLegacyPaymentFromFedaEvent(object)
    const target = payment || legacyPayment

    if (!target) {
      console.warn('Webhook FedaPay sans paiement local:', eventName, object?.id)
      return res.status(200).json({ received: true, ignored: true })
    }

    if (eventName === 'transaction.approved' || mapFedaPayStatus(object.status) === 'approved') {
      await applyApproved(target, {
        eventName: eventName || 'transaction.approved',
        eventId,
        raw: event,
      })
    } else if (eventName === 'transaction.declined' || mapFedaPayStatus(object.status) === 'declined') {
      await applyFailed(target, 'declined', {
        eventName: eventName || 'transaction.declined',
        eventId,
        message: 'Paiement refusé par l’opérateur Mobile Money',
        raw: event,
      })
    } else if (eventName === 'transaction.canceled' || mapFedaPayStatus(object.status) === 'canceled') {
      await applyFailed(target, 'canceled', {
        eventName: eventName || 'transaction.canceled',
        eventId,
        message: 'Paiement annulé',
        raw: event,
      })
    } else {
      target.lastEventName = eventName
      target.rawLastEvent = event
      if (!target.processedEventIds.includes(eventId) && eventId) {
        target.processedEventIds.push(eventId)
      }
      await target.save()
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Erreur traitement webhook FedaPay:', error)
    // Statut non-2xx → FedaPay retentera automatiquement
    return res.status(500).json({
      success: false,
      error: error.message || 'Traitement webhook impossible',
    })
  }
})

export default router
