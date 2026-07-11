import { Router } from 'express'
import { SubscriptionPlan } from '../models/SubscriptionPlan.js'
import { UserSubscription } from '../models/UserSubscription.js'
import { PaymentTransaction } from '../models/PaymentTransaction.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import {
  createPendingSubscription,
  getUserAccess,
  expireDueSubscriptions,
  getPendingSubscription,
} from '../utils/subscriptions.js'
import { startSubscriptionPayment, syncPaymentFromProvider } from '../utils/payments.js'
import { configureFedaPay, getFedaPayPublicKey } from '../services/fedapay.js'

const router = Router()

router.get('/plans', requireUserAuth, async (_req, res) => {
  try {
    const plans = await SubscriptionPlan.find({
      active: true,
      isGracePlan: { $ne: true },
    }).sort({ order: 1, price: 1 })
    res.json({
      success: true,
      data: { plans: plans.map((plan) => plan.toPublicJSON()) },
    })
  } catch (error) {
    console.error('Erreur catalogue abonnements:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/me', requireUserAuth, async (req, res) => {
  try {
    await expireDueSubscriptions(req.user._id)
    const access = await getUserAccess(req.user._id)
    const [history, payments] = await Promise.all([
      UserSubscription.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20),
      PaymentTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20),
    ])

    const latestPayment =
      payments.find((item) => item.status === 'pending') || payments[0] || null

    res.json({
      success: true,
      data: {
        ...access,
        history: history.map((item) => item.toPublicJSON()),
        payments: payments.map((item) => item.toPublicJSON()),
        latestPayment: latestPayment ? latestPayment.toPublicJSON() : null,
        fedapayPublicKey: getFedaPayPublicKey(),
        user: {
          soldeHeures: req.user.soldeHeures || 0,
          heuresEffectuees: req.user.heuresEffectuees || 0,
          heuresObjectif: req.user.heuresObjectif || 20,
        },
      },
    })
  } catch (error) {
    console.error('Erreur abonnement courant:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/subscribe', requireUserAuth, async (req, res) => {
  try {
    configureFedaPay()
    const { planId } = req.body ?? {}
    const plan = await SubscriptionPlan.findOne({
      _id: planId,
      active: true,
      isGracePlan: { $ne: true },
    })
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Offre introuvable ou inactive' })
    }

    let subscription = await getPendingSubscription(req.user._id)
    if (subscription && String(subscription.planId) !== String(plan._id)) {
      subscription.status = 'cancelled'
      await subscription.save()
      subscription = null
    }

    if (!subscription) {
      subscription = await createPendingSubscription(req.user._id, plan, {
        source: 'purchase',
        paymentNote: 'Paiement FedaPay en cours',
      })
    }

    const payment = await startSubscriptionPayment({
      user: req.user,
      subscription,
      plan,
    })

    const access = await getUserAccess(req.user._id)
    res.status(201).json({
      success: true,
      data: {
        subscription: subscription.toPublicJSON(),
        payment: payment.toPublicJSON(),
        access,
        message:
          'Redirection vers FedaPay. Votre abonnement s’activera automatiquement après confirmation du paiement Mobile Money.',
      },
    })
  } catch (error) {
    console.error('Erreur souscription/paiement:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Souscription impossible',
    })
  }
})

router.get('/payments/:paymentId', requireUserAuth, async (req, res) => {
  try {
    let payment = await PaymentTransaction.findOne({
      _id: req.params.paymentId,
      userId: req.user._id,
    })
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    }

    if (payment.status === 'pending' && payment.fedapayTransactionId) {
      try {
        payment = await syncPaymentFromProvider(payment)
      } catch (syncError) {
        console.warn('Sync paiement FedaPay:', syncError.message)
      }
    }

    const access = await getUserAccess(req.user._id)
    res.json({
      success: true,
      data: {
        payment: payment.toPublicJSON(),
        access,
      },
    })
  } catch (error) {
    console.error('Erreur statut paiement:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/payments/:paymentId/sync', requireUserAuth, async (req, res) => {
  try {
    configureFedaPay()
    let payment = await PaymentTransaction.findOne({
      _id: req.params.paymentId,
      userId: req.user._id,
    })
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    }
    payment = await syncPaymentFromProvider(payment)
    const access = await getUserAccess(req.user._id)
    res.json({
      success: true,
      data: {
        payment: payment.toPublicJSON(),
        access,
      },
    })
  } catch (error) {
    console.error('Erreur sync paiement:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Synchronisation impossible',
    })
  }
})

export default router
