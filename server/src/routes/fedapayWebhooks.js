import { Router } from 'express'
import { constructFedaPayEvent, mapFedaPayStatus } from '../services/fedapay.js'
import {
  applyApprovedAccessPayment,
  applyFailedAccessPayment,
  findPaymentFromFedaEvent,
} from '../utils/accessRequests.js'
import {
  applyApprovedReservationPayment,
  applyFailedReservationPayment,
} from '../utils/reservationPayments.js'
import { logger } from '../utils/logger.js'

const router = Router()

router.post('/', async (req, res) => {
  const signature =
    req.headers['x-fedapay-signature'] ||
    req.headers['X-FEDAPAY-SIGNATURE'] ||
    req.headers['x-FEDAPAY-signature']
  let event

  try {
    event = constructFedaPayEvent(req.body, signature)
  } catch (error) {
    const missingSecret = /FEDAPAY_WEBHOOK_SECRET/i.test(String(error.message || ''))
    logger.error('Webhook FedaPay signature invalide', {
      error: error.message,
      missingSecret,
      hasSignature: Boolean(signature),
      bodyType: Buffer.isBuffer(req.body) ? 'buffer' : typeof req.body,
      bodyLength: Buffer.isBuffer(req.body)
        ? req.body.length
        : String(req.body || '').length,
    })
    // Secret manquant = config serveur (503) ; sinon signature/payload invalide (400).
    return res.status(missingSecret ? 503 : 400).json({
      success: false,
      error: error.message,
    })
  }

  const eventName = event?.name || event?.type || ''
  const eventId = String(event?.id || `${eventName}:${event?.entity?.id || event?.object?.id || ''}`)
  const object = event?.entity || event?.object || event?.data?.object || {}

  try {
    const payment = await findPaymentFromFedaEvent(object)

    if (!payment) {
      logger.warn('Webhook FedaPay sans paiement local', {
        eventName,
        transactionId: object?.id,
        reference: object?.reference,
      })
      // Accusé de réception : événement inconnu / hors scope — ne pas faire réessayer FedaPay.
      return res.status(200).json({ received: true, ignored: true })
    }

    const isReservationPayment = Boolean(payment.reservationGroupId)
    const applyApproved = isReservationPayment ? applyApprovedReservationPayment : applyApprovedAccessPayment
    const applyFailed = isReservationPayment ? applyFailedReservationPayment : applyFailedAccessPayment

    if (eventName === 'transaction.approved' || mapFedaPayStatus(object.status) === 'approved') {
      await applyApproved(payment, {
        eventName: eventName || 'transaction.approved',
        eventId,
        raw: event,
      })
    } else if (eventName === 'transaction.declined' || mapFedaPayStatus(object.status) === 'declined') {
      await applyFailed(payment, 'declined', {
        eventName: eventName || 'transaction.declined',
        eventId,
        message: 'Paiement refusé par l’opérateur Mobile Money',
        raw: event,
      })
    } else if (eventName === 'transaction.canceled' || mapFedaPayStatus(object.status) === 'canceled') {
      await applyFailed(payment, 'canceled', {
        eventName: eventName || 'transaction.canceled',
        eventId,
        message: 'Paiement annulé',
        raw: event,
      })
    } else if (eventName === 'transaction.failed' || mapFedaPayStatus(object.status) === 'failed') {
      await applyFailed(payment, 'failed', {
        eventName: eventName || 'transaction.failed',
        eventId,
        message: 'Paiement échoué',
        raw: event,
      })
    } else {
      payment.lastEventName = eventName
      payment.rawLastEvent = event
      if (!payment.processedEventIds.includes(eventId) && eventId) {
        payment.processedEventIds.push(eventId)
      }
      await payment.save()
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    logger.error('Erreur traitement webhook FedaPay', {
      error: error.message,
      eventName,
      eventId,
      transactionId: object?.id,
    })
    // Erreur transitoire (Mongo, etc.) → 500 pour déclencher le retry FedaPay.
    return res.status(500).json({
      success: false,
      error: error.message || 'Traitement webhook impossible',
    })
  }
})

export default router
