import { PaymentTransaction } from '../models/PaymentTransaction.js'
import { UserSubscription } from '../models/UserSubscription.js'
import { activateSubscription } from './subscriptions.js'
import {
  createFedaPayCheckout,
  mapFedaPayStatus,
  retrieveFedaPayTransaction,
} from '../services/fedapay.js'

function callbackBase() {
  return (
    process.env.FEDAPAY_CALLBACK_URL ||
    `${String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/abonnement`
  )
}

export async function startSubscriptionPayment({ user, subscription, plan }) {
  const amount = Number(plan.price) || 0
  const description = `Abonnement ${plan.name} — Monpermis.bj`

  const payment = await PaymentTransaction.create({
    userId: user._id,
    subscriptionId: subscription._id,
    planId: plan._id,
    amount,
    currency: plan.currency || 'XOF',
    description,
    status: 'pending',
  })

  await PaymentTransaction.updateMany(
    {
      subscriptionId: subscription._id,
      status: 'pending',
      _id: { $ne: payment._id },
    },
    {
      $set: {
        status: 'canceled',
        errorMessage: 'Remplacé par une nouvelle tentative de paiement',
      },
    },
  )

  const checkout = await createFedaPayCheckout({
    amount,
    description,
    customer: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
    callbackUrl: `${callbackBase()}?payment=${payment._id}`,
    customMetadata: {
      paymentId: String(payment._id),
      subscriptionId: String(subscription._id),
      userId: String(user._id),
      planId: String(plan._id),
    },
  })

  payment.fedapayTransactionId = checkout.transactionId
  payment.fedapayReference = checkout.reference
  payment.paymentUrl = checkout.paymentUrl
  payment.status = mapFedaPayStatus(checkout.status)
  await payment.save()

  subscription.paymentNote = `FedaPay ${checkout.reference || checkout.transactionId}`
  await subscription.save()

  return payment
}

export async function applyApprovedPayment(payment, { eventName = '', eventId = '', raw = null } = {}) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true }
  }

  payment.status = 'approved'
  payment.lastEventName = eventName || payment.lastEventName
  payment.rawLastEvent = raw
  if (eventId) payment.processedEventIds.push(String(eventId))

  const subscription = await UserSubscription.findById(payment.subscriptionId)
  if (!subscription) {
    payment.errorMessage = 'Abonnement lié introuvable'
    await payment.save()
    const error = new Error(payment.errorMessage)
    error.status = 404
    throw error
  }

  if (subscription.status === 'pending_payment') {
    await activateSubscription(subscription)
    payment.activatedAt = new Date()
  }

  payment.errorMessage = ''
  await payment.save()
  return { payment, subscription, alreadyProcessed: false }
}

export async function applyFailedPayment(
  payment,
  status,
  { eventName = '', eventId = '', raw = null, message = '' } = {},
) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true }
  }

  payment.status = status
  payment.lastEventName = eventName || payment.lastEventName
  payment.errorMessage = message || payment.errorMessage
  payment.rawLastEvent = raw
  if (eventId) payment.processedEventIds.push(String(eventId))
  await payment.save()
  return { payment, alreadyProcessed: false }
}

export async function syncPaymentFromProvider(payment) {
  if (!payment.fedapayTransactionId) return payment
  const remote = await retrieveFedaPayTransaction(payment.fedapayTransactionId)
  const mapped = mapFedaPayStatus(remote.status)
  payment.fedapayReference = remote.reference || payment.fedapayReference
  payment.paymentMethod = remote.mode || payment.paymentMethod

  if (mapped === 'approved') {
    await applyApprovedPayment(payment, {
      eventName: 'transaction.synced',
      raw: remote,
    })
  } else if (mapped === 'declined' || mapped === 'canceled' || mapped === 'failed') {
    await applyFailedPayment(payment, mapped, {
      eventName: 'transaction.synced',
      message:
        mapped === 'declined'
          ? 'Paiement refusé'
          : mapped === 'canceled'
            ? 'Paiement annulé'
            : 'Paiement échoué',
      raw: remote,
    })
  } else {
    payment.status = 'pending'
    await payment.save()
  }

  return PaymentTransaction.findById(payment._id)
}

export async function findPaymentFromFedaEvent(eventObject = {}) {
  const metadata = eventObject.custom_metadata || eventObject.metadata || {}
  if (metadata.paymentId) {
    const byId = await PaymentTransaction.findById(metadata.paymentId)
    if (byId) return byId
  }
  if (eventObject.id) {
    const byTx = await PaymentTransaction.findOne({
      fedapayTransactionId: String(eventObject.id),
    })
    if (byTx) return byTx
  }
  if (eventObject.reference) {
    return PaymentTransaction.findOne({ fedapayReference: String(eventObject.reference) })
  }
  return null
}
