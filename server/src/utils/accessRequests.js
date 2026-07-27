import {
  AccessRequest,
  ACCESS_REQUEST_STATUSES,
  TIME_BASED_MODULES,
  QUANTITY_BASED_MODULES,
} from '../models/AccessRequest.js'
import { AccessModulePricing } from '../models/AccessModulePricing.js'
import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  createFedaPayCheckout,
  mapFedaPayStatus,
  retrieveFedaPayTransaction,
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
    let moduleKey = module
    if (!moduleKey && payment.accessRequestId) {
      const request = await AccessRequest.findById(payment.accessRequestId).select('module')
      moduleKey = request?.module || null
    }
    broadcastPaymentEvent({
      type: 'payment.updated',
      payment: {
        ...payment.toAdminJSON(learner),
        module: moduleKey,
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
    access[key] = requests.some((r) => {
      if (r.module !== key) return false
      if (QUANTITY_BASED_MODULES.includes(key)) return r.status === 'valide'
      return r.status === 'actif'
    })
  }

  const pending = requests.find((r) => ['en_attente', 'paiement_declare', 'en_verification'].includes(r.status))

  return {
    access,
    pendingRequest: pending ? pending.toPublicJSON() : null,
    requests: requests.map((r) => r.toPublicJSON()),
  }
}

const DEFAULT_MODULE_PRICING = [
  { key: 'code', label: 'Code de la route', unit: 'month', price: 2000 },
  { key: 'conduite_heures', label: 'Heures de conduite', unit: 'hour', price: 5000 },
  { key: 'conduite_videos', label: 'Vidéos pédagogiques conduite', unit: 'week', price: 500 },
  { key: 'ecodepermis', label: 'E-Codepermis', unit: 'month', price: 1000 },
  { key: 'aiChat', label: 'Chat IA tuteur', unit: 'month', price: 1000 },
]

/** Amorçage idempotent des 5 tarifs — n'écrase jamais un prix déjà modifié par l'admin. */
export async function ensureAccessModulePricing() {
  let created = 0
  for (const def of DEFAULT_MODULE_PRICING) {
    const exists = await AccessModulePricing.exists({ key: def.key })
    if (!exists) {
      await AccessModulePricing.create(def)
      created += 1
    }
  }
  return { created }
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
    amount: pricing.price * qty,
    currency: pricing.currency || 'XOF',
    unit: pricing.unit,
  })
  void broadcastAccessRequestUpdate(request, user)
  return request
}

function callbackBase() {
  return (
    process.env.FEDAPAY_CALLBACK_URL ||
    `${String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/abonnement`
  )
}

/** Démarre un paiement FedaPay pour une demande en_attente : crée le Payment, ouvre le checkout, passe en en_verification. */
export async function startFedaPayForRequest(user, request) {
  const payment = await Payment.create({
    accessRequestId: request._id,
    userId: user._id,
    method: 'fedapay',
    amount: request.amount,
    currency: request.currency,
    status: 'pending',
  })

  const callbackUrl = `${callbackBase()}?accessRequest=${request._id}`
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
  payment.status = mapFedaPayStatus(checkout.status)
  await payment.save()
  void broadcastPaymentUpdate(payment, { user, module: request.module })

  await transitionAccessRequest(request, 'en_verification', { actor: 'user', note: 'Paiement FedaPay initié' })

  return { request, payment, checkout: { ...checkout, callbackUrl } }
}

/** Déclaration d'un paiement hors plateforme par l'utilisateur (cash, virement direct…). */
export async function declareManualPayment(user, request, { declaredReference, note = '' }) {
  const reference = String(declaredReference || '').trim()
  if (reference.length < 3) {
    const error = new Error('Référence de paiement invalide')
    error.status = 400
    throw error
  }

  const payment = await Payment.create({
    accessRequestId: request._id,
    userId: user._id,
    method: 'manual',
    amount: request.amount,
    currency: request.currency,
    status: 'pending',
    declaredReference: reference,
    declaredAt: new Date(),
  })

  await transitionAccessRequest(request, 'paiement_declare', { actor: 'user', note })
  void broadcastPaymentUpdate(payment, { user, module: request.module })

  return { request, payment }
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

  const request = await AccessRequest.findById(payment.accessRequestId)
  if (!request) {
    const error = new Error('Demande d’accès liée introuvable')
    error.status = 404
    throw error
  }

  if (['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
    await transitionAccessRequest(request, 'valide', { actor: 'system', actorLabel: 'FedaPay', note: eventName })
  }

  return { payment, request, alreadyProcessed: false }
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

  const request = await AccessRequest.findById(payment.accessRequestId)
  if (request && ['en_attente', 'paiement_declare', 'en_verification'].includes(request.status)) {
    await transitionAccessRequest(request, 'rejete', { actor: 'system', actorLabel: 'FedaPay', note: message })
  }

  return { payment, request, alreadyProcessed: false }
}

export async function syncAccessPaymentFromProvider(payment) {
  if (payment.method !== 'fedapay' || !payment.fedapayTransactionId) return payment
  const remote = await retrieveFedaPayTransaction(payment.fedapayTransactionId)
  const mapped = mapFedaPayStatus(remote.status)
  payment.fedapayReference = remote.reference || payment.fedapayReference
  payment.paymentMethod = remote.mode || payment.paymentMethod

  if (mapped === 'approved') {
    await applyApprovedAccessPayment(payment, { eventName: 'transaction.synced', raw: remote })
  } else if (mapped === 'declined' || mapped === 'canceled' || mapped === 'failed') {
    await applyFailedAccessPayment(payment, mapped, {
      eventName: 'transaction.synced',
      message:
        mapped === 'declined' ? 'Paiement refusé' : mapped === 'canceled' ? 'Paiement annulé' : 'Paiement échoué',
      raw: remote,
    })
  } else {
    payment.status = 'pending'
    await payment.save()
  }

  return Payment.findById(payment._id)
}
