import { SubscriptionPlan, durationDaysFor } from '../models/SubscriptionPlan.js'
import { UserSubscription } from '../models/UserSubscription.js'
import { User } from '../models/User.js'
import { sendSubscriptionExpiryEmail } from '../services/email.js'
import { notifyUser } from '../services/notifications.js'
import { logger } from './logger.js'

const GRACE_DAYS = Math.max(1, Number(process.env.SUBSCRIPTION_GRACE_DAYS) || 14)

export function emptyAccess() {
  return {
    hasActiveSubscription: false,
    accessCode: false,
    accessConduite: false,
    accessECodepermis: false,
    accessAiChat: false,
    subscription: null,
    pendingSubscription: null,
  }
}

/** Expire les abonnements actifs dont la date de fin est dépassée. */
export async function expireDueSubscriptions(userId = null) {
  const filter = {
    status: 'active',
    endAt: { $ne: null, $lt: new Date() },
  }
  if (userId) filter.userId = userId
  await UserSubscription.updateMany(filter, { $set: { status: 'expired' } })
}

export async function getActiveSubscription(userId) {
  await expireDueSubscriptions(userId)
  return UserSubscription.findOne({
    userId,
    status: 'active',
    $or: [{ endAt: null }, { endAt: { $gte: new Date() } }],
  }).sort({ endAt: -1 })
}

export async function getPendingSubscription(userId) {
  return UserSubscription.findOne({
    userId,
    status: 'pending_payment',
  }).sort({ createdAt: -1 })
}

export async function getUserAccess(userId) {
  const [active, pending, freeOfferUsed] = await Promise.all([
    getActiveSubscription(userId),
    getPendingSubscription(userId),
    hasUsedFreeOffer(userId),
  ])

  if (!active) {
    return {
      ...emptyAccess(),
      pendingSubscription: pending ? pending.toPublicJSON() : null,
      freeOfferUsed: Boolean(freeOfferUsed),
    }
  }

  return {
    hasActiveSubscription: true,
    accessCode: Boolean(active.accessCode),
    accessConduite: Boolean(active.accessConduite),
    accessECodepermis: Boolean(active.accessECodepermis),
    accessAiChat: Boolean(active.accessAiChat),
    subscription: active.toPublicJSON(),
    pendingSubscription: pending ? pending.toPublicJSON() : null,
    freeOfferUsed: Boolean(freeOfferUsed),
  }
}

export function snapshotFromPlan(plan) {
  return {
    accessCode: Boolean(plan.accessCode),
    accessConduite: Boolean(plan.accessConduite),
    accessECodepermis: Boolean(plan.accessECodepermis),
    accessAiChat: Boolean(plan.accessAiChat),
    heuresIncluses: Number(plan.heuresIncluses) || 0,
    isFreeOffer: (Number(plan.price) || 0) <= 0 && !plan.isGracePlan,
    planName: plan.name,
    price: Number(plan.price) || 0,
    currency: plan.currency || 'XOF',
    durationDays: plan.getDurationDays
      ? plan.getDurationDays()
      : durationDaysFor(plan.durationType, plan.customDays, plan.customUnit),
  }
}

/** Un utilisateur ne peut consommer qu'une seule offre gratuite dans sa vie (annulée = non comptée). */
export async function hasUsedFreeOffer(userId) {
  return UserSubscription.exists({
    userId,
    isFreeOffer: true,
    status: { $ne: 'cancelled' },
  })
}

/**
 * Propage les changements d'un plan (nom, prix, droits) aux abonnements
 * actifs et en attente qui le référencent, pour que ce soit visible partout
 * (accueil, profil, historique). Ne recrédite pas d'heures et ne change pas
 * la date de fin déjà calculée.
 */
export async function syncSubscriptionsToPlan(plan) {
  const snap = snapshotFromPlan(plan)
  const result = await UserSubscription.updateMany(
    { planId: plan._id, status: { $in: ['active', 'pending_payment'] } },
    {
      $set: {
        planName: snap.planName,
        price: snap.price,
        currency: snap.currency,
        accessCode: snap.accessCode,
        accessConduite: snap.accessConduite,
        accessECodepermis: snap.accessECodepermis,
        accessAiChat: snap.accessAiChat,
        heuresIncluses: snap.heuresIncluses,
        isFreeOffer: snap.isFreeOffer,
      },
    },
  )
  return { updated: result.modifiedCount || 0 }
}

export async function createPendingSubscription(userId, plan, { source = 'purchase', paymentNote = '' } = {}) {
  const existingPending = await getPendingSubscription(userId)
  if (existingPending) {
    const error = new Error(
      'Vous avez déjà un paiement en cours. Terminez-le ou réessayez après annulation.',
    )
    error.status = 409
    throw error
  }

  const snap = snapshotFromPlan(plan)
  return UserSubscription.create({
    userId,
    planId: plan._id,
    status: 'pending_payment',
    ...snap,
    source,
    paymentNote: String(paymentNote || '').trim(),
  })
}

export async function activateSubscription(subscription, { adminId = null } = {}) {
  if (subscription.status === 'active') return subscription
  if (subscription.status === 'cancelled') {
    const error = new Error('Abonnement annulé, impossible à activer')
    error.status = 400
    throw error
  }

  const plan = await SubscriptionPlan.findById(subscription.planId)
  const durationDays =
    subscription.durationDays ||
    (plan
      ? plan.getDurationDays()
      : durationDaysFor('monthly'))

  const startAt = new Date()
  const endAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

  // Un seul actif à la fois : expirer les autres actifs
  await UserSubscription.updateMany(
    {
      userId: subscription.userId,
      status: 'active',
      _id: { $ne: subscription._id },
    },
    { $set: { status: 'expired' } },
  )

  subscription.status = 'active'
  subscription.startAt = startAt
  subscription.endAt = endAt
  subscription.activatedAt = startAt
  subscription.activatedByAdminId = adminId || null

  if (plan) {
    const snap = snapshotFromPlan(plan)
    Object.assign(subscription, snap)
  }

  const hours = Number(subscription.heuresIncluses) || 0
  if (hours > 0 && !subscription.hoursCredited) {
    await User.findByIdAndUpdate(subscription.userId, {
      $inc: { soldeHeures: hours },
    })
    subscription.hoursCredited = true
  }

  await subscription.save()

  await notifyUser(subscription.userId, {
    type: 'subscription_activated',
    title: 'Abonnement activé ✅',
    body: `Ton abonnement « ${subscription.planName || 'Offre'} » est actif jusqu’au ${endAt.toLocaleDateString('fr-FR')}.`,
    link: 'abonnement',
  })

  return subscription
}

export async function ensureDefaultPlans() {
  const count = await SubscriptionPlan.countDocuments()
  if (count > 0) {
    let grace = await SubscriptionPlan.findOne({ isGracePlan: true })
    if (!grace) {
      grace = await SubscriptionPlan.create({
        name: 'Période de grâce',
        description: 'Accès temporaire offert aux comptes existants',
        durationType: 'custom',
        customDays: GRACE_DAYS,
        price: 0,
        accessCode: true,
        accessConduite: true,
        accessECodepermis: true,
        accessAiChat: true,
        heuresIncluses: 0,
        active: false,
        isGracePlan: true,
        order: 999,
      })
    }
    await ensureAiChatOnEligiblePlans()
    return { created: false, grace }
  }

  const [grace] = await SubscriptionPlan.create([
    {
      name: 'Période de grâce',
      description: 'Accès temporaire offert aux comptes existants',
      durationType: 'custom',
      customDays: GRACE_DAYS,
      price: 0,
      accessCode: true,
      accessConduite: true,
      accessECodepermis: true,
      accessAiChat: true,
      heuresIncluses: 0,
      active: false,
      isGracePlan: true,
      order: 999,
    },
    {
      name: 'Code mensuel',
      description: 'Accès complet au code de la route pendant 30 jours',
      durationType: 'monthly',
      price: 5000,
      accessCode: true,
      accessConduite: false,
      accessECodepermis: false,
      accessAiChat: false,
      heuresIncluses: 0,
      active: true,
      order: 1,
    },
    {
      name: 'Conduite mensuel',
      description: 'Accès conduite + 4 heures incluses',
      durationType: 'monthly',
      price: 25000,
      accessCode: false,
      accessConduite: true,
      accessECodepermis: false,
      accessAiChat: false,
      heuresIncluses: 4,
      active: true,
      order: 2,
    },
    {
      name: 'Pack complet mensuel',
      description: 'Code + conduite + E-Codepermis + chat IA tuteur + 4 heures',
      durationType: 'monthly',
      price: 30000,
      accessCode: true,
      accessConduite: true,
      accessECodepermis: true,
      accessAiChat: true,
      heuresIncluses: 4,
      active: true,
      order: 3,
    },
  ])

  return { created: true, grace }
}

/**
 * Active le chat IA sur les formules éligibles (Pack complet + grâce)
 * et propage le droit aux abonnements actifs / en attente.
 */
export async function ensureAiChatOnEligiblePlans() {
  const plans = await SubscriptionPlan.find({
    $or: [{ isGracePlan: true }, { name: 'Pack complet mensuel' }],
  })
  for (const plan of plans) {
    if (plan.accessAiChat) continue
    plan.accessAiChat = true
    if (plan.name === 'Pack complet mensuel' && !String(plan.description || '').includes('chat IA')) {
      plan.description = 'Code + conduite + E-Codepermis + chat IA tuteur + 4 heures'
    }
    await plan.save()
    await syncSubscriptionsToPlan(plan)
  }
}

/** Attribue une période de grâce aux utilisateurs sans abonnement (actif ou en attente). */
/** Envoie un email d'avertissement aux abonnements expirant dans moins de 7 jours. */
export async function notifyExpiringSubscriptions() {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  const aboutToExpire = await UserSubscription.find({
    status: 'active',
    endAt: { $gte: now, $lte: in7Days },
    expiryWarningSent: { $ne: true },
  }).populate('userId', 'firstName lastName email')

  let sent = 0
  for (const sub of aboutToExpire) {
    const user = sub.userId
    if (!user?.email) continue
    try {
      await sendSubscriptionExpiryEmail(user, sub)
      await notifyUser(user._id, {
        type: 'subscription_expiring',
        title: 'Ton abonnement expire bientôt ⏳',
        body: `« ${sub.planName || 'Ton offre'} » expire le ${new Date(sub.endAt).toLocaleDateString('fr-FR')}. Renouvelle pour garder ton accès.`,
        link: 'abonnement',
      })
      sub.expiryWarningSent = true
      await sub.save()
      sent += 1
    } catch (err) {
      logger.error("Échec envoi avertissement expiration", { error: err.message, userId: String(user._id) })
    }
  }

  return { sent }
}

export async function grantGraceToUsersWithoutSubscription() {
  const { grace } = await ensureDefaultPlans()
  if (!grace) return { granted: 0 }

  const users = await User.find({ isActive: { $ne: false } }).select('_id')
  let granted = 0

  for (const user of users) {
    const existing = await UserSubscription.findOne({ userId: user._id })
    if (existing) continue

    const snap = snapshotFromPlan(grace)
    const startAt = new Date()
    const endAt = new Date(startAt.getTime() + snap.durationDays * 24 * 60 * 60 * 1000)

    await UserSubscription.create({
      userId: user._id,
      planId: grace._id,
      status: 'active',
      ...snap,
      hoursCredited: true, // pas d'heures sur la grâce par défaut
      startAt,
      endAt,
      activatedAt: startAt,
      source: 'grace',
    })
    granted += 1
  }

  return { granted }
}
