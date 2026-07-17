import { Router } from 'express'
import { SubscriptionPlan, DURATION_TYPES, CUSTOM_DURATION_UNITS } from '../models/SubscriptionPlan.js'
import { UserSubscription } from '../models/UserSubscription.js'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import {
  activateSubscription,
  createPendingSubscription,
  expireDueSubscriptions,
  snapshotFromPlan,
  syncSubscriptionsToPlan,
} from '../utils/subscriptions.js'

const router = Router()
router.use(requireAdminAuth)

function parsePlanBody(body = {}) {
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const durationType = DURATION_TYPES.includes(body.durationType)
    ? body.durationType
    : 'monthly'
  const customDays = Math.max(1, Number(body.customDays) || 30)
  const customUnit = CUSTOM_DURATION_UNITS.includes(body.customUnit) ? body.customUnit : 'days'
  const price = Math.max(0, Number(body.price) || 0)
  const accessCode = Boolean(body.accessCode)
  const accessConduite = Boolean(body.accessConduite)
  const accessECodepermis = Boolean(body.accessECodepermis)
  const accessAiChat = Boolean(body.accessAiChat)
  const heuresIncluses = Math.max(0, Number(body.heuresIncluses) || 0)
  const active = body.active !== false && body.active !== 'false'
  const order = Number(body.order) || 0

  if (!name) {
    const error = new Error('Nom du modèle requis')
    error.status = 400
    throw error
  }
  if (!accessCode && !accessConduite && !accessECodepermis) {
    const error = new Error('Sélectionnez au moins un droit d’accès')
    error.status = 400
    throw error
  }

  return {
    name,
    description,
    durationType,
    customDays,
    customUnit,
    price,
    accessCode,
    accessConduite,
    accessECodepermis,
    accessAiChat,
    heuresIncluses,
    active,
    order,
  }
}

router.get('/plans', async (_req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ isGracePlan: 1, order: 1, createdAt: 1 })
    res.json({
      success: true,
      data: { plans: plans.map((plan) => plan.toAdminJSON()) },
    })
  } catch (error) {
    console.error('Erreur liste plans:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/plans', async (req, res) => {
  try {
    const data = parsePlanBody(req.body)
    const plan = await SubscriptionPlan.create({ ...data, isGracePlan: false })
    res.status(201).json({ success: true, data: { plan: plan.toAdminJSON() } })
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Création impossible',
    })
  }
})

router.patch('/plans/:planId', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.planId)
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Modèle introuvable' })
    }
    if (plan.isGracePlan) {
      const customDays = Math.max(1, Number(req.body.customDays) || plan.customDays)
      plan.customDays = customDays
      plan.name = String(req.body.name || plan.name).trim() || plan.name
      plan.description = String(req.body.description ?? plan.description).trim()
      if (req.body.active !== undefined) plan.active = Boolean(req.body.active)
      await plan.save()
      return res.json({ success: true, data: { plan: plan.toAdminJSON() } })
    }

    const data = parsePlanBody({ ...plan.toObject(), ...req.body })
    Object.assign(plan, data)
    await plan.save()
    // Répercuter le nom/prix/droits sur les abonnements actifs et en attente
    const synced = await syncSubscriptionsToPlan(plan)
    res.json({
      success: true,
      data: { plan: plan.toAdminJSON(), syncedSubscriptions: synced.updated },
    })
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Mise à jour impossible',
    })
  }
})

router.post('/plans/:planId/deactivate', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.planId)
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Modèle introuvable' })
    }
    if (plan.isGracePlan) {
      return res.status(400).json({
        success: false,
        error: 'Le plan de grâce ne peut pas être désactivé ainsi',
      })
    }
    plan.active = false
    await plan.save()
    res.json({ success: true, data: { plan: plan.toAdminJSON() } })
  } catch (error) {
    console.error('Erreur désactivation plan:', error)
    res.status(500).json({ success: false, error: 'Désactivation impossible' })
  }
})

router.get('/learners', async (req, res) => {
  try {
    await expireDueSubscriptions()
    const status = String(req.query.status || '').trim()
    const filter = {}
    if (['pending_payment', 'active', 'expired', 'cancelled', 'none'].includes(status)) {
      if (status !== 'none') filter.status = status
    }

    const users = await User.find().sort({ createdAt: -1 })
    const subs = await UserSubscription.find().sort({ createdAt: -1 })
    const byUser = new Map()
    for (const sub of subs) {
      const key = String(sub.userId)
      if (!byUser.has(key)) byUser.set(key, [])
      byUser.get(key).push(sub)
    }

    let learners = users.map((user) => {
      const list = byUser.get(String(user._id)) || []
      const active = list.find((s) => s.status === 'active') || null
      const pending = list.find((s) => s.status === 'pending_payment') || null
      const latest = active || pending || list[0] || null
      let derivedStatus = 'none'
      if (active) derivedStatus = 'active'
      else if (pending) derivedStatus = 'pending_payment'
      else if (latest?.status === 'expired') derivedStatus = 'expired'
      else if (latest?.status === 'cancelled') derivedStatus = 'cancelled'

      return {
        user: user.toAdminJSON(),
        status: derivedStatus,
        subscription: latest ? latest.toAdminJSON(user) : null,
        pending: pending ? pending.toAdminJSON(user) : null,
        active: active ? active.toAdminJSON(user) : null,
      }
    })

    if (status === 'none') {
      learners = learners.filter((row) => row.status === 'none')
    } else if (status) {
      learners = learners.filter((row) => row.status === status)
    }

    res.json({ success: true, data: { learners } })
  } catch (error) {
    console.error('Erreur liste abonnements apprenants:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/pending', async (_req, res) => {
  try {
    const pending = await UserSubscription.find({ status: 'pending_payment' })
      .sort({ createdAt: 1 })
      .populate('userId')
    res.json({
      success: true,
      data: {
        subscriptions: pending.map((sub) =>
          sub.toAdminJSON(sub.userId && typeof sub.userId === 'object' ? sub.userId : null),
        ),
      },
    })
  } catch (error) {
    console.error('Erreur abonnements en attente:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/:subscriptionId/activate', async (req, res) => {
  try {
    const subscription = await UserSubscription.findById(req.params.subscriptionId)
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Abonnement introuvable' })
    }
    if (subscription.status !== 'pending_payment' && subscription.status !== 'expired') {
      return res.status(400).json({
        success: false,
        error: 'Seuls les abonnements en attente (ou expirés via réactivation manuelle) peuvent être activés ainsi',
      })
    }

    // Pour expired, on recrée via pending flow plutôt — n'activer que pending
    if (subscription.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        error: 'Activez uniquement une souscription en attente de paiement',
      })
    }

    await activateSubscription(subscription, { adminId: req.admin._id })
    const user = await User.findById(subscription.userId)
    res.json({
      success: true,
      data: { subscription: subscription.toAdminJSON(user) },
    })
  } catch (error) {
    console.error('Erreur activation abonnement:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Activation impossible',
    })
  }
})

/** Admin change le type de plan d'un abonnement existant d'un élève. */
router.post('/:subscriptionId/change-plan', async (req, res) => {
  try {
    const { planId } = req.body ?? {}
    const subscription = await UserSubscription.findById(req.params.subscriptionId)
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Abonnement introuvable' })
    }
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return res.status(400).json({
        success: false,
        error: 'Impossible de changer le plan d’un abonnement annulé ou expiré',
      })
    }
    const plan = await SubscriptionPlan.findById(planId)
    if (!plan || plan.isGracePlan) {
      return res.status(404).json({ success: false, error: 'Modèle introuvable' })
    }

    const snap = snapshotFromPlan(plan)
    subscription.planId = plan._id
    subscription.planName = snap.planName
    subscription.price = snap.price
    subscription.currency = snap.currency
    subscription.accessCode = snap.accessCode
    subscription.accessConduite = snap.accessConduite
    subscription.accessECodepermis = snap.accessECodepermis
    subscription.heuresIncluses = snap.heuresIncluses
    subscription.isFreeOffer = snap.isFreeOffer
    subscription.durationDays = snap.durationDays

    // Si actif, recalculer la date de fin depuis l'activation avec la nouvelle durée
    if (subscription.status === 'active' && subscription.startAt) {
      subscription.endAt = new Date(
        new Date(subscription.startAt).getTime() + snap.durationDays * 24 * 60 * 60 * 1000,
      )
    }

    await subscription.save()
    const user = await User.findById(subscription.userId)
    res.json({ success: true, data: { subscription: subscription.toAdminJSON(user) } })
  } catch (error) {
    console.error('Erreur changement de plan:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Changement de plan impossible',
    })
  }
})

router.post('/:subscriptionId/cancel', async (req, res) => {
  try {
    const subscription = await UserSubscription.findById(req.params.subscriptionId)
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Abonnement introuvable' })
    }
    if (subscription.status === 'cancelled') {
      return res.json({ success: true, data: { subscription: subscription.toAdminJSON() } })
    }
    subscription.status = 'cancelled'
    await subscription.save()
    const user = await User.findById(subscription.userId)
    res.json({ success: true, data: { subscription: subscription.toAdminJSON(user) } })
  } catch (error) {
    console.error('Erreur annulation abonnement:', error)
    res.status(500).json({ success: false, error: 'Annulation impossible' })
  }
})

/** Admin assigne un plan à un élève (pending ou active immédiat). */
router.post('/assign', async (req, res) => {
  try {
    const { userId, planId, activateNow = false, paymentNote = '' } = req.body ?? {}
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'Apprenant introuvable' })
    }
    const plan = await SubscriptionPlan.findById(planId)
    if (!plan || plan.isGracePlan) {
      return res.status(404).json({ success: false, error: 'Modèle introuvable' })
    }

    // Annuler un éventuel pending existant
    await UserSubscription.updateMany(
      { userId: user._id, status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    )

    let subscription = await createPendingSubscription(user._id, plan, {
      source: 'admin',
      paymentNote,
    })

    if (activateNow) {
      subscription = await activateSubscription(subscription, { adminId: req.admin._id })
    }

    res.status(201).json({
      success: true,
      data: { subscription: subscription.toAdminJSON(user) },
    })
  } catch (error) {
    console.error('Erreur assignation abonnement:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Assignation impossible',
    })
  }
})

export default router
