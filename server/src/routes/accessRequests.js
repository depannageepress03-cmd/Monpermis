import { Router } from 'express'
import { requireUserAuth } from '../middleware/userAuth.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  activateFreeAccessModules,
  cancelPendingOnlinePayment,
  checkoutCartOnlineAccess,
  computeModuleAmount,
  getUserModuleAccess,
  purchaseOnlineAccess,
  syncAccessPaymentFromProvider,
} from '../utils/accessRequests.js'
import { configureFedaPay, FEDAPAY_MOBILE_OPERATORS } from '../services/fedapay.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireUserAuth)

router.get('/modules', async (_req, res) => {
  try {
    const modules = await AccessModulePricing.find({ active: true }).sort({ key: 1 })
    res.json({
      success: true,
      data: {
        modules: modules.map((m) => m.toPublicJSON()),
        operators: FEDAPAY_MOBILE_OPERATORS,
      },
    })
  } catch (error) {
    logger.error('Erreur catalogue modules:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Quote montant panier (même règles que le checkout). */
router.post('/quote', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!items.length) {
      return res.status(400).json({ success: false, error: 'Panier vide' })
    }
    const lines = []
    let total = 0
    for (const raw of items) {
      if (!ACCESS_MODULES.includes(raw?.module)) continue
      const pricing = await AccessModulePricing.findOne({ key: raw.module, active: true })
      if (!pricing) continue
      const quantity = Math.max(1, Number(raw.quantity) || 1)
      const amount = computeModuleAmount(pricing, quantity)
      total += amount
      lines.push({
        module: pricing.key,
        label: pricing.label,
        unit: pricing.unit,
        unitPrice: pricing.price,
        quantity,
        amount,
        discountApplied: pricing.key === 'conduite_heures' && quantity >= 2 ? 1000 : 0,
      })
    }
    res.json({ success: true, data: { lines, total, currency: 'XOF' } })
  } catch (error) {
    logger.error('Erreur quote panier:', { error: error.message })
    res.status(500).json({ success: false, error: 'Calcul impossible' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const result = await getUserModuleAccess(req.user._id)
    res.json({
      success: true,
      data: {
        ...result,
        user: { soldeHeures: req.user.soldeHeures || 0 },
      },
    })
  } catch (error) {
    logger.error('Erreur accès courant:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/**
 * Tunnel Mobile Money in-app : réseau → pays → téléphone → sendNow.
 * Body: { items: [{ module, quantity }], operator, country?, phone? }
 */
router.post('/checkout', async (req, res) => {
  try {
    const { items, operator, country = 'BJ', phone, replace = true } = req.body ?? {}
    configureFedaPay()
    const result = await checkoutCartOnlineAccess({
      user: req.user,
      items,
      operator,
      country,
      phone: phone || req.user.phone,
      replace: Boolean(replace),
    })
    const access = await getUserModuleAccess(req.user._id)
    res.status(201).json({
      success: true,
      data: {
        payment: result.payment.toPublicJSON(),
        accessRequest: result.accessRequest.toPublicJSON(),
        accessRequests: result.accessRequests.map((r) => r.toPublicJSON()),
        operator: result.operator,
        phone: result.phone,
        country: result.country,
        access: { ...access, user: { soldeHeures: req.user.soldeHeures || 0 } },
        message: 'Validez la demande de paiement sur votre téléphone Mobile Money.',
      },
    })
  } catch (error) {
    logger.error('Erreur checkout Mobile Money:', {
      error: error.message,
      status: error.status,
      cause: error.cause?.httpResponse?.data || error.cause?.message || null,
    })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Paiement impossible à initier',
      code: error.code || undefined,
      expectedOperator: error.expectedOperator || undefined,
    })
  }
})

/** Active les modules à 0 FCFA (ex. vidéos de conduite) sans paiement. */
router.post('/claim-free', async (req, res) => {
  try {
    const modules = Array.isArray(req.body?.modules) ? req.body.modules : ['conduite_videos']
    const activated = await activateFreeAccessModules({ user: req.user, modules })
    const access = await getUserModuleAccess(req.user._id)
    res.status(201).json({
      success: true,
      data: {
        accessRequests: activated.map((r) => r.toPublicJSON()),
        access: { ...access, user: { soldeHeures: req.user.soldeHeures || 0 } },
        message:
          activated.length > 0
            ? 'Accès gratuit activé.'
            : 'Accès déjà actif.',
      },
    })
  } catch (error) {
    logger.error('Erreur activation gratuite:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Activation impossible',
    })
  }
})

/** Paiement en ligne (legacy single-module, redirection FedaPay). */
router.post('/', async (req, res) => {
  try {
    const { module, quantity = 1, replace = false } = req.body ?? {}
    if (!ACCESS_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Module invalide' })
    }

    configureFedaPay()
    const result = await purchaseOnlineAccess({
      user: req.user,
      module,
      quantity,
      replace: Boolean(replace),
    })

    if (result.kind === 'already_active') {
      const access = await getUserModuleAccess(req.user._id)
      return res.status(200).json({
        success: true,
        data: {
          accessRequest: result.accessRequest.toPublicJSON(),
          payment: result.payment?.toPublicJSON?.() || null,
          access: { ...access, user: { soldeHeures: req.user.soldeHeures || 0 } },
          alreadyActive: true,
        },
      })
    }

    return res.status(result.kind === 'resume' ? 200 : 201).json({
      success: true,
      data: {
        accessRequest: result.accessRequest.toPublicJSON(),
        payment: result.payment.toPublicJSON(),
        paymentUrl: result.paymentUrl,
        callbackUrl: result.callbackUrl,
        resumed: result.kind === 'resume',
      },
    })
  } catch (error) {
    logger.error('Erreur création paiement en ligne:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Paiement impossible à initier',
    })
  }
})

router.post('/:id/cancel', async (req, res) => {
  try {
    const request = await cancelPendingOnlinePayment(req.user, req.params.id)
    const access = await getUserModuleAccess(req.user._id)
    res.json({
      success: true,
      data: {
        accessRequest: request.toPublicJSON(),
        access: { ...access, user: { soldeHeures: req.user.soldeHeures || 0 } },
      },
    })
  } catch (error) {
    logger.error('Erreur annulation paiement:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Annulation impossible',
    })
  }
})

router.post('/:id/sync', async (req, res) => {
  try {
    configureFedaPay()
    const request = await AccessRequest.findOne({ _id: req.params.id, userId: req.user._id })
    if (!request) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' })
    }
    const payment = await Payment.findOne({
      method: 'fedapay',
      $or: [{ accessRequestId: request._id }, { accessRequestIds: request._id }],
    }).sort({ createdAt: -1 })
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement FedaPay introuvable' })
    }

    await syncAccessPaymentFromProvider(payment)
    const refreshed = await AccessRequest.findById(request._id)
    const refreshedPayment = await Payment.findById(payment._id)
    const linkedIds = refreshedPayment.linkedRequestIds()
    const accessRequests = await AccessRequest.find({ _id: { $in: linkedIds } })
    const access = await getUserModuleAccess(req.user._id)
    const user = await User.findById(req.user._id).select('soldeHeures')

    res.json({
      success: true,
      data: {
        accessRequest: refreshed.toPublicJSON(),
        accessRequests: accessRequests.map((r) => r.toPublicJSON()),
        payment: refreshedPayment.toPublicJSON(),
        access: {
          ...access,
          user: { soldeHeures: user?.soldeHeures || 0 },
        },
      },
    })
  } catch (error) {
    logger.error('Erreur synchronisation paiement:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Synchronisation impossible',
    })
  }
})

export default router
