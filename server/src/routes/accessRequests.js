import { Router } from 'express'
import { requireUserAuth } from '../middleware/userAuth.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  cancelPendingOnlinePayment,
  getUserModuleAccess,
  purchaseOnlineAccess,
  syncAccessPaymentFromProvider,
} from '../utils/accessRequests.js'
import { configureFedaPay } from '../services/fedapay.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireUserAuth)

router.get('/modules', async (_req, res) => {
  try {
    const modules = await AccessModulePricing.find({ active: true }).sort({ key: 1 })
    res.json({ success: true, data: { modules: modules.map((m) => m.toPublicJSON()) } })
  } catch (error) {
    logger.error('Erreur catalogue modules:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
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

/** Paiement en ligne uniquement (FedaPay / Mobile Money). */
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
    const payment = await Payment.findOne({ accessRequestId: request._id, method: 'fedapay' }).sort({
      createdAt: -1,
    })
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Paiement FedaPay introuvable' })
    }

    await syncAccessPaymentFromProvider(payment)
    const refreshed = await AccessRequest.findById(request._id)
    const refreshedPayment = await Payment.findById(payment._id)
    const access = await getUserModuleAccess(req.user._id)
    const user = await User.findById(req.user._id).select('soldeHeures')

    res.json({
      success: true,
      data: {
        accessRequest: refreshed.toPublicJSON(),
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
