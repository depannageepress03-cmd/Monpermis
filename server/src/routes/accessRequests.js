import { Router } from 'express'
import { requireUserAuth } from '../middleware/userAuth.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  createAccessRequest,
  declareManualPayment,
  getUserModuleAccess,
  startFedaPayForRequest,
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

router.post('/', async (req, res) => {
  try {
    const { module, quantity = 1, method } = req.body ?? {}
    if (!ACCESS_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Module invalide' })
    }
    if (!['fedapay', 'manual'].includes(method)) {
      return res.status(400).json({ success: false, error: 'Méthode de paiement invalide' })
    }

    const existingPending = await AccessRequest.findOne({
      userId: req.user._id,
      module,
      status: { $in: ['en_attente', 'paiement_declare', 'en_verification'] },
    })
    if (existingPending) {
      return res.status(409).json({
        success: false,
        error: 'Une demande pour ce module est déjà en cours. Terminez-la ou attendez sa résolution.',
      })
    }

    const request = await createAccessRequest({ user: req.user, module, quantity })

    if (method === 'fedapay') {
      configureFedaPay()
      const { payment, checkout } = await startFedaPayForRequest(req.user, request)
      return res.status(201).json({
        success: true,
        data: {
          accessRequest: request.toPublicJSON(),
          payment: payment.toPublicJSON(),
          paymentUrl: checkout.paymentUrl,
          callbackUrl: checkout.callbackUrl,
        },
      })
    }

    // method === 'manual' : la demande reste en_attente, l'utilisateur déclarera
    // sa preuve ensuite via POST /:id/declare-payment.
    return res.status(201).json({
      success: true,
      data: { accessRequest: request.toPublicJSON() },
    })
  } catch (error) {
    logger.error('Erreur création demande d’accès:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Création impossible',
    })
  }
})

router.post('/:id/declare-payment', async (req, res) => {
  try {
    const request = await AccessRequest.findOne({ _id: req.params.id, userId: req.user._id })
    if (!request) {
      return res.status(404).json({ success: false, error: 'Demande introuvable' })
    }
    if (request.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        error: 'Seule une demande en attente peut faire l’objet d’une déclaration de paiement',
      })
    }

    const { declaredReference, note } = req.body ?? {}
    const { payment } = await declareManualPayment(req.user, request, { declaredReference, note })

    res.json({
      success: true,
      data: { accessRequest: request.toPublicJSON(), payment: payment.toPublicJSON() },
    })
  } catch (error) {
    logger.error('Erreur déclaration paiement:', { error: error.message })
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Déclaration impossible',
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
    const access = await getUserModuleAccess(req.user._id)
    const user = await User.findById(req.user._id).select('soldeHeures')

    res.json({
      success: true,
      data: {
        accessRequest: refreshed.toPublicJSON(),
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
