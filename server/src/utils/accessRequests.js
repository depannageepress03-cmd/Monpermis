import {
  AccessRequest,
  ACCESS_REQUEST_STATUSES,
  TIME_BASED_MODULES,
  QUANTITY_BASED_MODULES,
} from '../models/AccessRequest.js'
import { AccessModulePricing, ACCESS_MODULES } from '../models/AccessModulePricing.js'
import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  createFedaPayCheckout,
  guessBeninMobileOperator,
  mapFedaPayStatus,
  normalizeBeninPhone,
  normalizeOperatorId,
  operatorLabel,
  refreshFedaPayPaymentUrl,
  retrieveFedaPayTransaction,
  sendFedaPayMobileMoney,
  FEDAPAY_MOBILE_OPERATORS,
} from '../services/fedapay.js'
import { notifyUser } from '../services/notifications.js'
import { broadcastPaymentEvent } from '../services/paymentEvents.js'
import { logger } from './logger.js'

/**
 * Table d'adjacence des transitions légales. Toute transition absente de cette
 * table est refusée — notamment en_attente -> actif directement (interdit par
 * construction : actif n'est atteignable que depuis valide).
 */
const ALLOWED_TRANSITIONS = {
  en_attente: ['paiement_declare', 'en_verification', 'rejete'],
  paiement_declare: ['en_verification', 'valide', 'rejete'],
  en_verification: ['valide', 'rejete'],
  valide: ['actif'],
  actif: ['expire'],
  expire: [],
  rejete: [],
}

function assertTransitionAllowed(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    const error = new Error(`Transition invalide : ${fromStatus} -> ${toStatus}`)
    error.status = 400
    throw error
  }
}

function isTimeBased(module) {
  return TIME_BASED_MODULES.includes(module)
}

function durationMsForRequest(request) {
  const qty = Math.max(1, Number(request.quantity) || 1)
  if (request.unit === 'week') return qty * 7 * 24 * 60 * 60 * 1000
  if (request.unit === 'month') return qty * 30 * 24 * 60 * 60 * 1000
  return qty * 24 * 60 * 60 * 1000 // 'flat' — traité comme 1 jour par défaut si jamais utilisé en temporel
}

/** Notifie le dashboard admin en direct (réutilise le diffuseur SSE existant du dashboard Paiements). */
async function broadcastAccessRequestUpdate(request, user = null) {
  try {
    const learner = user || (await User.findById(request.userId).select('firstName lastName email phone'))
    broadcastPaymentEvent({
      type: 'access_request.updated',
      accessRequest: request.toAdminJSON(learner),
    })
  } catch {
    // Confort d'affichage uniquement, jamais bloquant.
  }
}

/** Diffuse un paiement pour le suivi temps réel du tableau de bord admin. */
async function broadcastPaymentUpdate(payment, { user = null, module = null } = {}) {
  try {
    const learner = user || (await User.findById(payment.userId).select('firstName lastName email phone'))
    const linkedIds = payment.linkedRequestIds?.() || (payment.accessRequestId ? [payment.accessRequestId] : [])
    const linkedRequests = linkedIds.length
      ? await AccessRequest.find({ _id: { $in: linkedIds } }).select('module status')
      : []
    const modules = linkedRequests.map((r) => r.module).filter(Boolean)
    let moduleKey = module || modules[0] || null
    if (!moduleKey && payment.accessRequestId) {
      const request = await AccessRequest.findById(payment.accessRequestId).select('module')
      moduleKey = request?.module || null
    }
    broadcastPaymentEvent({
      type: 'payment.updated',
      payment: {
        ...payment.toAdminJSON(learner),
        module: moduleKey,
        modules,
      },
    })
  } catch {
    // Confort d'affichage uniquement, jamais bloquant.
  }
}

/**
 * Cœur de la machine à états. Applique la transition, ses effets de bord,
 * journalise dans AccessAuditLog (append-only), notifie l'utilisateur et
 * diffuse la mise à jour en direct. Retourne la demande à jour.
 *
 * `actor` : 'user' | 'system' | 'admin:<adminId>'
 */
export async function transitionAccessRequest(request, toStatus, { actor, actorLabel = '', note = '' } = {}) {
  if (!ACCESS_REQUEST_STATUSES.includes(toStatus)) {
    const error = new Error(`Statut cible inconnu : ${toStatus}`)
    error.status = 400
    throw error
  }
  const fromStatus = request.status
  assertTransitionAllowed(fromStatus, toStatus)

  request.status = toStatus
  if (note) request.lastDecisionNote = note

  if (toStatus === 'valide') {
    if (QUANTITY_BASED_MODULES.includes(request.module)) {
      if (!request.hoursCredited) {
        await User.findByIdAndUpdate(request.userId, { $inc: { soldeHeures: request.quantity } })
        request.hoursCredited = true
      }
    }
  }

  await request.save()
  await AccessAuditLog.create({
    accessRequestId: request._id,
    fromStatus,
    toStatus,
    actor,
    actorLabel,
    note,
  })

  // Chaîne immédiatement valide -> actif pour les modules temporels (deux entrées d'audit distinctes).
  if (toStatus === 'valide' && isTimeBased(request.module)) {
    const fromStatus2 = request.status
    request.status = 'actif'
    request.startAt = new Date()
    request.endAt = new Date(request.startAt.getTime() + durationMsForRequest(request))
    await request.save()
    await AccessAuditLog.create({
      accessRequestId: request._id,
      fromStatus: fromStatus2,
      toStatus: 'actif',
      actor: 'system',
      actorLabel: 'Activation automatique',
      note: '',
    })
  }

  if (request.status === 'actif' || request.status === 'valide') {
    void notifyUser(request.userId, {
      type: 'access_validated',
      title: 'Accès activé ✅',
      body: `Ton accès « ${request.module} » est maintenant actif.`,
      link: 'abonnement',
    })
  } else if (request.status === 'rejete') {
    void notifyUser(request.userId, {
      type: 'access_rejected',
      title: 'Demande refusée',
      body: note || 'Ta demande d’accès a été refusée. Contacte l’auto-école pour plus de détails.',
      link: 'abonnement',
    })
  }

  void broadcastAccessRequestUpdate(request)

  return request
}

/** Sweep périodique : expire les accès temporels dont la période est dépassée. */
export async function expireDueAccessRequests(userId = null) {
  const filter = {
    status: 'actif',
    endAt: { $ne: null, $lt: new Date() },
  }
  if (userId) filter.userId = userId
  const due = await AccessRequest.find(filter)
  for (const request of due) {
    try {
      await transitionAccessRequest(request, 'expire', { actor: 'system', actorLabel: 'Expiration automatique' })
    } catch (error) {
      logger.error('Erreur expiration accessRequest', { error: error.message, id: String(request._id) })
    }
  }
  return { expired: due.length }
}

/** Accès courant par module + demandes récentes, pour /me et pour le middleware de porte. */
export async function getUserModuleAccess(userId) {
  await expireDueAccessRequests(userId)
  const requests = await AccessRequest.find({ userId }).sort({ createdAt: -1 }).limit(50)

  const access = {}
  for (const key of ['code', 'conduite_heures', 'conduite_videos', 'ecodepermis', 'aiChat']) {
    // Les vidéos de conduite sont gratuites pour tous, y compris sans achat du code.
    access[key] =
      key === 'conduite_videos' ||
      requests.some((r) => {
        if (r.module !== key) return false
        if (QUANTITY_BASED_MODULES.includes(key)) return r.status === 'valide'
        return r.status === 'actif'
      })
  }
  // E-Codepermis est désormais inclus dans l'abonnement Code de la route (plus d'achat séparé).
  access.ecodepermis = access.ecodepermis || access.code

  const pending = requests.find((r) =>
    ['en_attente', 'paiement_declare', 'en_verification'].includes(r.status),
  )

  let pendingPayment = null
  if (pending) {
    const payment = await Payment.findOne({
      method: 'fedapay',
      $or: [{ accessRequestId: pending._id }, { accessRequestIds: pending._id }],
    }).sort({ createdAt: -1 })
    if (payment) {
      pendingPayment = {
        ...payment.toPublicJSON(),
        callbackUrl: buildFedaPayCallbackUrl(pending._id),
      }
    }
  }

  return {
    access,
    pendingRequest: pending ? pending.toPublicJSON() : null,
    pendingPayment,
    requests: requests.map((r) => r.toPublicJSON()),
  }
}

const DEFAULT_MODULE_PRICING = [
  { key: 'code', label: 'Code de la route', unit: 'month', price: 2000 },
  { key: 'conduite_heures', label: 'Heures de conduite', unit: 'hour', price: 5000 },
  { key: 'conduite_videos', label: 'Vidéos pédagogiques conduite', unit: 'month', price: 1500 },
  { key: 'ecodepermis', label: 'E-Codepermis', unit: 'month', price: 1000 },
  { key: 'aiChat', label: 'Chat IA tuteur', unit: 'month', price: 1000 },
]

/** Montant figé pour un module (réduction −1000 FCFA si N≥2 heures de conduite). */
export function computeModuleAmount(pricingOrKey, quantity = 1, unitPrice = null) {
  const key = typeof pricingOrKey === 'string' ? pricingOrKey : pricingOrKey?.key
  const price =
    unitPrice != null
      ? Number(unitPrice)
      : Number(typeof pricingOrKey === 'object' ? pricingOrKey?.price : 0) || 0
  const qty = Math.max(1, Number(quantity) || 1)
  let amount = Math.round(price * qty)
  if (key === 'conduite_heures' && qty >= 2) {
    amount = Math.max(0, amount - 1000)
  }
  return amount
}

/** Amorçage idempotent des 5 tarifs — n'écrase jamais un prix déjà modifié par l'admin. */
export async function ensureAccessModulePricing() {
  let created = 0
  let migrated = 0
  for (const def of DEFAULT_MODULE_PRICING) {
    const exists = await AccessModulePricing.exists({ key: def.key })
    if (!exists) {
      await AccessModulePricing.create(def)
      created += 1
    }
  }

  // Soft migration : ancien seed vidéos 500/week → 1500/month (une seule fois).
  const videos = await AccessModulePricing.findOne({ key: 'conduite_videos' })
  if (videos && videos.unit === 'week' && Number(videos.price) === 500) {
    videos.unit = 'month'
    videos.price = 1500
    videos.label = 'Vidéos pédagogiques conduite'
    await videos.save()
    migrated += 1
  }

  return { created, migrated }
}

export async function getModulePricing(key) {
  const pricing = await AccessModulePricing.findOne({ key, active: true })
  if (!pricing) {
    const error = new Error('Ce module n’est pas disponible à l’achat actuellement')
    error.status = 404
    throw error
  }
  return pricing
}

/** Crée une nouvelle demande d'accès en_attente, montant figé selon le tarif courant. */
export async function createAccessRequest({ user, module, quantity = 1 }) {
  const pricing = await getModulePricing(module)
  const qty = Math.max(1, Number(quantity) || 1)
  const request = await AccessRequest.create({
    userId: user._id,
    module,
    status: 'en_attente',
    quantity: qty,
    amount: computeModuleAmount(pricing, qty),
    currency: pricing.currency || 'XOF',
    unit: pricing.unit,
  })
  void broadcastAccessRequestUpdate(request, user)
  return request
}

function sanitizeHttpUrl(value) {
  const raw = String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    // Recompose proprement (supprime espaces invisibles / fragments invalides)
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function callbackBase() {
  const candidates = [
    process.env.FEDAPAY_CALLBACK_URL,
    process.env.API_PUBLIC_URL,
    process.env.CLIENT_URL,
    'https://monpermis-api.onrender.com',
  ]

  for (const candidate of candidates) {
    const cleaned = sanitizeHttpUrl(candidate)
    if (!cleaned) continue
    // Ne jamais renvoyer vers l’admin pour le retour apprenant.
    if (/monpermis-admin/i.test(cleaned)) continue
    if (cleaned.endsWith('/abonnement')) return cleaned
    return `${cleaned}/abonnement`
  }

  return 'https://monpermis-api.onrender.com/abonnement'
}

function buildFedaPayCallbackUrl(accessRequestId) {
  const base = callbackBase()
  const url = new URL(base.endsWith('/abonnement') ? base : `${base}/abonnement`)
  if (accessRequestId) url.searchParams.set('accessRequest', String(accessRequestId))
  return url.toString()
}

/** Démarre un paiement FedaPay pour une demande en_attente : crée le Payment, ouvre le checkout, passe en en_verification. */
export async function startFedaPayForRequest(user, request) {
  const phone = normalizeBeninPhone(user.phone)
  if (!phone) {
    logger.warn('Checkout FedaPay sans téléphone normalisé', {
      userId: String(user._id),
      phone: user.phone || null,
    })
  }

  const payment = await Payment.create({
    accessRequestId: request._id,
    accessRequestIds: [request._id],
    userId: user._id,
    method: 'fedapay',
    amount: request.amount,
    currency: request.currency,
    status: 'pending',
  })

  const callbackUrl = buildFedaPayCallbackUrl(request._id)

  try {
    const checkout = await createFedaPayCheckout({
      amount: request.amount,
      description: `${request.module} — Monpermis.bj`,
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      callbackUrl,
      customMetadata: {
        paymentId: String(payment._id),
        accessRequestId: String(request._id),
        userId: String(user._id),
        module: request.module,
      },
    })

    payment.fedapayTransactionId = checkout.transactionId
    payment.fedapayReference = checkout.reference
    payment.paymentUrl = checkout.paymentUrl
    payment.status = mapFedaPayStatus(checkout.status) || 'pending'
    if (payment.status !== 'pending' && payment.status !== 'approved') {
      payment.status = 'pending'
    }
    await payment.save()
    void broadcastPaymentUpdate(payment, { user, module: request.module })

    await transitionAccessRequest(request, 'en_verification', {
      actor: 'user',
      note: 'Paiement FedaPay initié',
    })

    return { request, payment, checkout: { ...checkout, callbackUrl } }
  } catch (error) {
    payment.status = 'failed'
    payment.errorMessage = error.message || 'Échec initiation FedaPay'
    await payment.save()
    void broadcastPaymentUpdate(payment, { user, module: request.module })
    throw error
  }
}

async function cancelPendingRequestAndPayment(request, user, note) {
  if (!['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
    return request
  }
  await transitionAccessRequest(request, 'rejete', { actor: 'user', note })
  const payment = await Payment.findOne({
    $or: [{ accessRequestId: request._id }, { accessRequestIds: request._id }],
  }).sort({ createdAt: -1 })
  if (payment && payment.status === 'pending') {
    payment.status = 'canceled'
    payment.errorMessage = note
    await payment.save()
    void broadcastPaymentUpdate(payment, { user, module: request.module })
  }
  return request
}

/**
 * Achat en ligne uniquement (FedaPay) :
 * - reprend un checkout pending existant
 * - synchronise d’abord si une demande est déjà en cours
 * - remplace une demande bloquée / échouée
 */
export async function purchaseOnlineAccess({ user, module, quantity = 1, replace = false }) {
  let existing = await AccessRequest.findOne({
    userId: user._id,
    module,
    status: { $in: ['en_attente', 'paiement_declare', 'en_verification'] },
  })

  if (existing) {
    const payment = await Payment.findOne({
      accessRequestId: existing._id,
      method: 'fedapay',
    }).sort({ createdAt: -1 })

    if (payment?.fedapayTransactionId) {
      try {
        await syncAccessPaymentFromProvider(payment)
      } catch (error) {
        logger.warn('Sync préalable checkout FedaPay', { error: error.message, id: String(existing._id) })
      }

      existing = await AccessRequest.findById(existing._id)
      const refreshedPayment = await Payment.findById(payment._id)

      if (existing && ['actif', 'valide'].includes(existing.status)) {
        return {
          kind: 'already_active',
          accessRequest: existing,
          payment: refreshedPayment,
        }
      }

      if (!replace && existing?.status === 'en_verification' && refreshedPayment?.status === 'pending') {
        // Les liens FedaPay sont à usage unique / 24h → toujours régénérer avant reprise.
        try {
          const refreshedCheckout = await refreshFedaPayPaymentUrl(refreshedPayment.fedapayTransactionId)
          refreshedPayment.paymentUrl = refreshedCheckout.paymentUrl
          refreshedPayment.fedapayReference =
            refreshedCheckout.reference || refreshedPayment.fedapayReference
          await refreshedPayment.save()
          void broadcastPaymentUpdate(refreshedPayment, { user, module })
        } catch (error) {
          logger.warn('Régénération lien FedaPay impossible, nouveau checkout', {
            error: error.message,
            id: String(existing._id),
          })
          await cancelPendingRequestAndPayment(
            existing,
            user,
            'Lien de paiement expiré — nouveau paiement requis',
          )
          // tombe dans la création d’un nouveau checkout ci-dessous
          existing = null
        }

        if (existing) {
          const latestPayment = await Payment.findById(refreshedPayment._id)
          return {
            kind: 'resume',
            accessRequest: existing,
            payment: latestPayment,
            paymentUrl: latestPayment.paymentUrl,
            callbackUrl: buildFedaPayCallbackUrl(existing._id),
          }
        }
      }

      if (existing && ['en_attente', 'paiement_declare', 'en_verification'].includes(existing.status)) {
        await cancelPendingRequestAndPayment(
          existing,
          user,
          replace ? 'Remplacé par un nouveau paiement en ligne' : 'Ancien paiement abandonné ou échoué',
        )
      }
    } else if (existing) {
      await cancelPendingRequestAndPayment(existing, user, 'Demande incomplète remplacée par un paiement en ligne')
    }
  }

  const request = await createAccessRequest({ user, module, quantity })
  const { payment, checkout } = await startFedaPayForRequest(user, request)
  const refreshed = await AccessRequest.findById(request._id)

  return {
    kind: 'created',
    accessRequest: refreshed,
    payment,
    paymentUrl: checkout.paymentUrl,
    callbackUrl: checkout.callbackUrl,
  }
}

/** Annule une demande d’accès encore en cours (paiement non finalisé). */
export async function cancelPendingOnlinePayment(user, requestId) {
  const request = await AccessRequest.findOne({ _id: requestId, userId: user._id })
  if (!request) {
    const error = new Error('Demande introuvable')
    error.status = 404
    throw error
  }
  if (!['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
    const error = new Error('Cette demande ne peut plus être annulée')
    error.status = 400
    throw error
  }

  const payment = await Payment.findOne({
    method: 'fedapay',
    $or: [{ accessRequestId: request._id }, { accessRequestIds: request._id }],
  }).sort({ createdAt: -1 })

  const linkedIds = payment?.linkedRequestIds?.() || [request._id]
  for (const id of linkedIds) {
    const linked = await AccessRequest.findOne({ _id: id, userId: user._id })
    if (linked && ['en_attente', 'paiement_declare', 'en_verification'].includes(linked.status)) {
      await cancelPendingRequestAndPayment(linked, user, 'Paiement annulé par l’utilisateur')
    }
  }

  return AccessRequest.findById(request._id)
}

/**
 * Checkout panier multi-offres : un paiement FedaPay + push Mobile Money (sendNow).
 * items: [{ module, quantity }]
 */
export async function checkoutCartOnlineAccess({
  user,
  items,
  operator,
  phone,
  country = 'BJ',
  replace = true,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Sélectionnez au moins une offre à payer')
    error.status = 400
    throw error
  }

  const requestedMode = normalizeOperatorId(operator)
  if (!requestedMode || !FEDAPAY_MOBILE_OPERATORS.includes(requestedMode)) {
    const error = new Error('Réseau Mobile Money invalide. Choisissez MTN, Moov ou Celtiis.')
    error.status = 400
    throw error
  }

  const normalizedPhone = normalizeBeninPhone(phone) || normalizeBeninPhone(user.phone)
  if (!normalizedPhone) {
    const error = new Error(
      'Numéro de téléphone Mobile Money invalide. Indiquez un numéro béninois valide.',
    )
    error.status = 400
    throw error
  }

  const guessed = guessBeninMobileOperator(normalizedPhone)
  let mode = requestedMode
  if (guessed && guessed !== requestedMode) {
    // Le mauvais réseau est la cause n°1 d’absence de push USSD (ACCOUNT_NOT_FOUND / API_ERROR).
    const error = new Error(
      `Le numéro ${normalizedPhone} appartient au réseau ${operatorLabel(guessed)}, pas ${operatorLabel(requestedMode)}. Choisis « ${operatorLabel(guessed)} » puis réessaie.`,
    )
    error.status = 400
    error.code = 'OPERATOR_MISMATCH'
    error.expectedOperator = guessed
    throw error
  }
  if (guessed) mode = guessed


  const access = await getUserModuleAccess(user._id)
  const normalizedItems = []
  const seen = new Set()

  for (const raw of items) {
    const module = raw?.module
    const quantity = Math.max(1, Number(raw?.quantity) || 1)
    if (!module || seen.has(module)) continue
    seen.add(module)

    if (access.access[module] && module !== 'conduite_heures') {
      continue // déjà actif (heures restent achetable pour créditer le solde)
    }

    const pricing = await getModulePricing(module)
    normalizedItems.push({
      module,
      quantity,
      pricing,
      amount: computeModuleAmount(pricing, quantity),
    })
  }

  if (!normalizedItems.length) {
    const error = new Error('Aucune offre à payer (accès déjà actifs)')
    error.status = 400
    throw error
  }

  // Annule les demandes pending des modules concernés.
  for (const item of normalizedItems) {
    const existing = await AccessRequest.findOne({
      userId: user._id,
      module: item.module,
      status: { $in: ['en_attente', 'paiement_declare', 'en_verification'] },
    })
    if (existing && replace) {
      await cancelPendingRequestAndPayment(existing, user, 'Remplacé par un nouveau paiement Mobile Money')
    } else if (existing && !replace) {
      const error = new Error('Un paiement est déjà en cours pour cette offre')
      error.status = 409
      throw error
    }
  }

  const requests = []
  for (const item of normalizedItems) {
    const request = await createAccessRequest({
      user,
      module: item.module,
      quantity: item.quantity,
    })
    requests.push(request)
  }

  const totalAmount = requests.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const primary = requests[0]
  const payment = await Payment.create({
    accessRequestId: primary._id,
    accessRequestIds: requests.map((r) => r._id),
    userId: user._id,
    method: 'fedapay',
    amount: totalAmount,
    currency: primary.currency || 'XOF',
    status: 'pending',
    paymentMethod: mode,
  })

  const callbackUrl = buildFedaPayCallbackUrl(primary._id)
  const description =
    requests.length === 1
      ? `${primary.module} — Monpermis.bj`
      : `Panier Monpermis (${requests.map((r) => r.module).join(', ')})`

  try {
    const checkout = await sendFedaPayMobileMoney({
      amount: totalAmount,
      description,
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: normalizedPhone,
      },
      callbackUrl,
      customMetadata: {
        paymentId: String(payment._id),
        accessRequestId: String(primary._id),
        accessRequestIds: requests.map((r) => String(r._id)).join(','),
        userId: String(user._id),
        modules: requests.map((r) => r.module).join(','),
      },
      operator: mode,
      phone: normalizedPhone,
      country,
    })

    payment.fedapayTransactionId = checkout.transactionId
    payment.fedapayReference = checkout.reference
    payment.paymentUrl = checkout.paymentUrl || ''
    payment.paymentMethod = mode
    payment.status = 'pending'
    await payment.save()
    void broadcastPaymentUpdate(payment, { user })

    for (const request of requests) {
      await transitionAccessRequest(request, 'en_verification', {
        actor: 'user',
        note: `Paiement Mobile Money (${mode.toUpperCase()}) initié`,
      })
    }

    const refreshedRequests = await AccessRequest.find({ _id: { $in: requests.map((r) => r._id) } })
    return {
      payment: await Payment.findById(payment._id),
      accessRequests: refreshedRequests,
      accessRequest: refreshedRequests[0],
      operator: mode,
      phone: normalizedPhone,
      country: String(country || 'BJ').toUpperCase(),
    }
  } catch (error) {
    payment.status = 'failed'
    payment.errorMessage = error.message || 'Échec initiation Mobile Money'
    await payment.save()
    void broadcastPaymentUpdate(payment, { user })
    for (const request of requests) {
      try {
        const current = await AccessRequest.findById(request._id)
        if (current && ['en_attente', 'en_verification'].includes(current.status)) {
          await transitionAccessRequest(current, 'rejete', {
            actor: 'system',
            note: error.message || 'Échec initiation Mobile Money',
          })
        }
      } catch {
        /* ignore */
      }
    }
    throw error
  }
}

/** Déclaration d'un paiement hors plateforme — désactivée (paiement en ligne uniquement). */
export async function declareManualPayment() {
  const error = new Error('Le paiement manuel n’est plus disponible. Utilisez le paiement Mobile Money en ligne.')
  error.status = 410
  throw error
}

/** Durée restante affichable pour un abonnement temporel. */
export function remainingForAccessRequest(request, now = new Date()) {
  if (QUANTITY_BASED_MODULES.includes(request.module)) {
    return {
      remainingMs: null,
      remainingLabel: request.hoursCredited
        ? `${request.quantity} h créditées`
        : `${request.quantity} h`,
    }
  }
  if (!request.endAt || request.status !== 'actif') {
    return { remainingMs: 0, remainingLabel: 'Expiré' }
  }
  const remainingMs = Math.max(0, new Date(request.endAt).getTime() - now.getTime())
  if (remainingMs <= 0) return { remainingMs: 0, remainingLabel: 'Expiré' }
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days >= 1) {
    return {
      remainingMs,
      remainingLabel: hours > 0 ? `${days} j ${hours} h` : `${days} jour${days > 1 ? 's' : ''}`,
    }
  }
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 1) {
    return {
      remainingMs,
      remainingLabel: minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`,
    }
  }
  return { remainingMs, remainingLabel: `${Math.max(1, minutes)} min` }
}

/**
 * Attribution manuelle exceptionnelle d’un abonnement / pack par un admin
 * (sans paiement). Active immédiatement l’accès.
 */
export async function adminGrantModuleAccess({ userId, module, quantity = 1, note = '', admin }) {
  if (!ACCESS_MODULES.includes(module)) {
    const error = new Error('Module inconnu')
    error.status = 400
    throw error
  }
  const user = await User.findById(userId)
  if (!user) {
    const error = new Error('Apprenant introuvable')
    error.status = 404
    throw error
  }

  const pricing = await AccessModulePricing.findOne({ key: module })
  if (!pricing) {
    const error = new Error('Tarif module non configuré')
    error.status = 404
    throw error
  }

  const qty = Math.max(1, Math.floor(Number(quantity) || 1))
  const trimmedNote = String(note || '').trim() || 'Attribution manuelle exceptionnelle'
  const actor = `admin:${admin._id}`
  const actorLabel = admin.fullName || 'Admin'

  const request = new AccessRequest({
    userId: user._id,
    module,
    status: 'en_attente',
    quantity: qty,
    amount: 0,
    currency: pricing.currency || 'XOF',
    unit: pricing.unit,
    lastDecisionNote: trimmedNote,
  })

  if (QUANTITY_BASED_MODULES.includes(module)) {
    request.status = 'valide'
    await User.findByIdAndUpdate(user._id, { $inc: { soldeHeures: qty } })
    request.hoursCredited = true
    await request.save()
    await AccessAuditLog.create({
      accessRequestId: request._id,
      fromStatus: '',
      toStatus: 'valide',
      actor,
      actorLabel,
      note: trimmedNote,
    })
  } else {
    request.status = 'actif'
    request.startAt = new Date()
    request.endAt = new Date(request.startAt.getTime() + durationMsForRequest(request))
    await request.save()
    await AccessAuditLog.create({
      accessRequestId: request._id,
      fromStatus: '',
      toStatus: 'actif',
      actor,
      actorLabel,
      note: trimmedNote,
    })
  }

  void notifyUser(user._id, {
    type: 'access_validated',
    title: 'Abonnement activé ✅',
    body: `Un accès « ${pricing.label || module} » t’a été attribué par l’auto-école.`,
    link: 'abonnement',
  })
  void broadcastAccessRequestUpdate(request, user)

  return request
}

/** Décision admin sur une demande en_attente ou paiement_declare — note obligatoire. */
export async function adminValidateAccessRequest(request, payment, { decision, note, admin }) {
  const trimmedNote = String(note || '').trim()
  if (!trimmedNote) {
    const error = new Error('Une note est obligatoire pour valider ou rejeter une demande')
    error.status = 400
    throw error
  }
  if (!['valide', 'rejete'].includes(decision)) {
    const error = new Error('Décision invalide')
    error.status = 400
    throw error
  }
  if (!['en_attente', 'paiement_declare'].includes(request.status)) {
    const error = new Error('Seules les demandes en attente ou en paiement déclaré peuvent être validées ainsi')
    error.status = 400
    throw error
  }

  if (payment) {
    payment.status = decision === 'valide' ? 'approved' : 'declined'
    payment.verifiedByAdminId = admin._id
    payment.verifiedAt = new Date()
    payment.adminNote = trimmedNote
    if (decision === 'valide') payment.activatedAt = new Date()
    await payment.save()
    void broadcastPaymentUpdate(payment, { module: request.module })
  }

  const updated = await transitionAccessRequest(request, decision, {
    actor: `admin:${admin._id}`,
    actorLabel: admin.fullName,
    note: trimmedNote,
  })

  return updated
}

// --- Intégration webhook / synchronisation FedaPay ---

export async function findPaymentFromFedaEvent(eventObject = {}) {
  const metadata = eventObject.custom_metadata || eventObject.metadata || {}
  if (metadata.paymentId) {
    const byId = await Payment.findById(metadata.paymentId)
    if (byId) return byId
  }
  if (eventObject.id) {
    const byTx = await Payment.findOne({ fedapayTransactionId: String(eventObject.id) })
    if (byTx) return byTx
  }
  if (eventObject.reference) {
    return Payment.findOne({ fedapayReference: String(eventObject.reference) })
  }
  return null
}

export async function applyApprovedAccessPayment(payment, { eventName = '', eventId = '', raw = null } = {}) {
  if (eventId && payment.processedEventIds.includes(String(eventId))) {
    return { payment, alreadyProcessed: true }
  }

  payment.status = 'approved'
  payment.lastEventName = eventName || payment.lastEventName
  payment.rawLastEvent = raw
  payment.activatedAt = new Date()
  if (eventId) payment.processedEventIds.push(String(eventId))
  await payment.save()
  void broadcastPaymentUpdate(payment)

  const requestIds = payment.linkedRequestIds()
  if (!requestIds.length) {
    const error = new Error('Demande d’accès liée introuvable')
    error.status = 404
    throw error
  }

  const requests = []
  for (const id of requestIds) {
    const request = await AccessRequest.findById(id)
    if (!request) continue
    if (['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
      await transitionAccessRequest(request, 'valide', {
        actor: 'system',
        actorLabel: 'FedaPay',
        note: eventName,
      })
    }
    requests.push(await AccessRequest.findById(id))
  }

  if (!requests.length) {
    const error = new Error('Demande d’accès liée introuvable')
    error.status = 404
    throw error
  }

  return { payment, request: requests[0], requests, alreadyProcessed: false }
}

export async function applyFailedAccessPayment(
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
  void broadcastPaymentUpdate(payment)

  const requestIds = payment.linkedRequestIds()
  const requests = []
  for (const id of requestIds) {
    const request = await AccessRequest.findById(id)
    if (request && ['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
      await transitionAccessRequest(request, 'rejete', {
        actor: 'system',
        actorLabel: 'FedaPay',
        note: message,
      })
      requests.push(await AccessRequest.findById(id))
    }
  }

  return { payment, request: requests[0] || null, requests, alreadyProcessed: false }
}

export async function syncAccessPaymentFromProvider(payment) {
  if (payment.method !== 'fedapay' || !payment.fedapayTransactionId) return payment
  const remote = await retrieveFedaPayTransaction(payment.fedapayTransactionId)
  const mapped = mapFedaPayStatus(remote.status)
  payment.fedapayReference = remote.reference || payment.fedapayReference
  const remoteMode = String(remote.mode || '').toLowerCase()
  if (remoteMode === 'mtn_open') payment.paymentMethod = 'mtn'
  else if (remoteMode === 'sbin') payment.paymentMethod = 'celtiis'
  else if (remoteMode === 'moov') payment.paymentMethod = 'moov'
  else if (remoteMode) payment.paymentMethod = remoteMode

  if (mapped === 'approved') {
    await applyApprovedAccessPayment(payment, { eventName: 'transaction.synced', raw: remote })
  } else if (mapped === 'declined' || mapped === 'canceled' || mapped === 'failed') {
    const code = String(remote.last_error_code || '').toUpperCase()
    let message =
      mapped === 'declined' ? 'Paiement refusé' : mapped === 'canceled' ? 'Paiement annulé' : 'Paiement échoué'
    if (code === 'ACCOUNT_NOT_FOUND') {
      message =
        'Ce numéro n’a pas de compte Mobile Money sur le réseau choisi. Vérifie MTN / Moov / Celtiis.'
    } else if (code === 'API_ERROR') {
      message =
        'Le réseau Mobile Money a refusé le retrait. Vérifie que tu as choisi le bon opérateur pour ce numéro.'
    }
    await applyFailedAccessPayment(payment, mapped, {
      eventName: 'transaction.synced',
      message,
      raw: remote,
    })
  } else {
    payment.status = 'pending'
    await payment.save()
  }

  return Payment.findById(payment._id)
}
