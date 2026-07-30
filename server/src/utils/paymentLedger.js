import { PaymentLedgerEntry } from '../models/PaymentLedgerEntry.js'
import { logger } from './logger.js'

export function paymentKind(payment) {
  if (payment?.reservationGroupId) return 'reservation'
  const ids = typeof payment?.linkedRequestIds === 'function' ? payment.linkedRequestIds() : []
  if (ids?.length || payment?.accessRequestId || (payment?.accessRequestIds || []).length) {
    return 'abonnement'
  }
  return 'autre'
}

/**
 * Statut métier affiché dans la trésorerie (Payment.status + flags remboursement).
 */
export function computeFinanceStatus(payment) {
  if (!payment) return 'pending'
  if (payment.needsRefund) return 'needsRefund'
  if (payment.refundResolvedAt) return 'refunded'
  if (
    !payment.needsRefund &&
    payment.adminNote &&
    /\[Remboursement\]/i.test(String(payment.adminNote)) &&
    payment.status === 'approved'
  ) {
    return 'refunded'
  }
  return payment.status || 'pending'
}

/**
 * Append-only : enregistre un événement financier. Idempotent si `idempotencyKey` fourni.
 * Jamais throw vers l’appelant métier (fire-and-forget safe).
 */
export async function recordPaymentLedgerEvent(payment, options = {}) {
  if (!payment?._id) return null

  const {
    eventType,
    fromStatus = '',
    toStatus = '',
    actor = 'system',
    actorLabel = '',
    adminId = null,
    note = '',
    fedapayEventId = '',
    fedapayEventName = '',
    idempotencyKey = null,
    metadata = null,
    needsRefund = Boolean(payment.needsRefund),
  } = options

  if (!eventType) return null

  const doc = {
    paymentId: payment._id,
    userId: payment.userId || null,
    kind: paymentKind(payment),
    eventType,
    fromStatus: fromStatus || '',
    toStatus: toStatus || payment.status || '',
    amount: Number(payment.amount) || 0,
    currency: payment.currency || 'XOF',
    needsRefund,
    actor,
    actorLabel: actorLabel || '',
    adminId: adminId || null,
    note: note || '',
    fedapayEventId: fedapayEventId ? String(fedapayEventId) : '',
    fedapayEventName: fedapayEventName || '',
    idempotencyKey: idempotencyKey || null,
    metadata: metadata ?? null,
  }

  try {
    if (idempotencyKey) {
      const existing = await PaymentLedgerEntry.findOne({ idempotencyKey }).lean()
      if (existing) return existing
    }
    return await PaymentLedgerEntry.create(doc)
  } catch (error) {
    if (error?.code === 11000) {
      return PaymentLedgerEntry.findOne({ idempotencyKey }).lean()
    }
    logger.error('Écriture ledger paiement impossible', {
      paymentId: String(payment._id),
      eventType,
      error: error.message,
    })
    return null
  }
}

/** Enregistre la création d’un Payment (pending). */
export function recordPaymentCreated(payment, extras = {}) {
  return recordPaymentLedgerEvent(payment, {
    eventType: 'created',
    fromStatus: '',
    toStatus: payment.status || 'pending',
    actor: extras.actor || 'user',
    actorLabel: extras.actorLabel || 'Apprenant',
    note: extras.note || 'Paiement initié',
    idempotencyKey: `created:${String(payment._id)}`,
    metadata: extras.metadata || null,
  })
}

/**
 * Après applyApproved* / applyFailed* : journalise le résultat (statut et/ou orphan).
 */
export async function recordPaymentOutcome(previousPayment, result, extras = {}) {
  const payment = result?.payment || previousPayment
  if (!payment) return null

  const fromStatus = previousPayment?.status || ''
  const toStatus = payment.status || ''
  const eventId = extras.eventId ? String(extras.eventId) : ''
  const eventName = extras.eventName || ''
  const actor = extras.actor || 'fedapay'
  const actorLabel = extras.actorLabel || 'FedaPay'

  const writes = []

  if (!result?.alreadyProcessed && fromStatus !== toStatus) {
    const mappedType =
      toStatus === 'approved'
        ? 'approved'
        : toStatus === 'declined'
          ? 'declined'
          : toStatus === 'canceled'
            ? 'canceled'
            : toStatus === 'failed'
              ? 'failed'
              : null

    if (mappedType) {
      writes.push(
        recordPaymentLedgerEvent(payment, {
          eventType: mappedType,
          fromStatus,
          toStatus,
          actor,
          actorLabel,
          fedapayEventId: eventId,
          fedapayEventName: eventName,
          note: extras.note || payment.errorMessage || '',
          needsRefund: Boolean(payment.needsRefund),
          idempotencyKey: eventId
            ? `${mappedType}:${String(payment._id)}:${eventId}`
            : `${mappedType}:${String(payment._id)}:${fromStatus}->${toStatus}`,
          metadata: extras.metadata || null,
        }),
      )
    }
  }

  if (result?.needsRefund || payment.needsRefund) {
    const orphanKey = eventId
      ? `needs_refund:${String(payment._id)}:${eventId}`
      : `needs_refund:${String(payment._id)}:${payment.errorMessage || 'flag'}`
    writes.push(
      recordPaymentLedgerEvent(payment, {
        eventType: 'needs_refund',
        fromStatus: toStatus || fromStatus,
        toStatus: toStatus || fromStatus,
        actor,
        actorLabel,
        fedapayEventId: eventId,
        fedapayEventName: eventName,
        note: payment.errorMessage || 'Remboursement requis',
        needsRefund: true,
        idempotencyKey: orphanKey,
        metadata: {
          orphan: Boolean(result?.orphan),
          ...(extras.metadata && typeof extras.metadata === 'object' ? extras.metadata : {}),
        },
      }),
    )
  }

  const results = await Promise.all(writes)
  return results.filter(Boolean)
}

/**
 * Construit une timeline à partir du ledger ; synthétise depuis Payment si journal vide (historique).
 */
export function synthesizeTimelineFromPayment(payment) {
  if (!payment) return []
  const events = []
  const kind = paymentKind(payment)

  events.push({
    id: `synth-created-${payment._id}`,
    paymentId: String(payment._id),
    userId: payment.userId ? String(payment.userId) : null,
    kind,
    eventType: 'created',
    fromStatus: '',
    toStatus: 'pending',
    amount: payment.amount,
    currency: payment.currency || 'XOF',
    needsRefund: false,
    actor: 'user',
    actorLabel: 'Apprenant',
    adminId: null,
    note: 'Paiement initié (historique reconstruit)',
    fedapayEventId: '',
    fedapayEventName: '',
    metadata: { synthesized: true },
    createdAt: payment.createdAt,
  })

  if (payment.status === 'approved' && payment.activatedAt) {
    events.push({
      id: `synth-approved-${payment._id}`,
      paymentId: String(payment._id),
      userId: payment.userId ? String(payment.userId) : null,
      kind,
      eventType: 'approved',
      fromStatus: 'pending',
      toStatus: 'approved',
      amount: payment.amount,
      currency: payment.currency || 'XOF',
      needsRefund: false,
      actor: 'fedapay',
      actorLabel: 'FedaPay',
      adminId: null,
      note: payment.lastEventName || '',
      fedapayEventId: '',
      fedapayEventName: payment.lastEventName || '',
      metadata: { synthesized: true },
      createdAt: payment.activatedAt,
    })
  }

  if (['failed', 'declined', 'canceled'].includes(payment.status)) {
    events.push({
      id: `synth-${payment.status}-${payment._id}`,
      paymentId: String(payment._id),
      userId: payment.userId ? String(payment.userId) : null,
      kind,
      eventType: payment.status,
      fromStatus: 'pending',
      toStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'XOF',
      needsRefund: false,
      actor: 'fedapay',
      actorLabel: 'FedaPay',
      adminId: null,
      note: payment.errorMessage || '',
      fedapayEventId: '',
      fedapayEventName: payment.lastEventName || '',
      metadata: { synthesized: true },
      createdAt: payment.updatedAt || payment.createdAt,
    })
  }

  if (payment.needsRefund) {
    events.push({
      id: `synth-needs_refund-${payment._id}`,
      paymentId: String(payment._id),
      userId: payment.userId ? String(payment.userId) : null,
      kind,
      eventType: 'needs_refund',
      fromStatus: payment.status,
      toStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'XOF',
      needsRefund: true,
      actor: 'system',
      actorLabel: 'Système',
      adminId: null,
      note: payment.errorMessage || 'Remboursement requis',
      fedapayEventId: '',
      fedapayEventName: '',
      metadata: { synthesized: true },
      createdAt: payment.updatedAt || payment.activatedAt || payment.createdAt,
    })
  }

  if (payment.refundResolvedAt || (/\[Remboursement\]/i.test(String(payment.adminNote || '')) && !payment.needsRefund)) {
    events.push({
      id: `synth-refund_resolved-${payment._id}`,
      paymentId: String(payment._id),
      userId: payment.userId ? String(payment.userId) : null,
      kind,
      eventType: 'refund_resolved',
      fromStatus: payment.status,
      toStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'XOF',
      needsRefund: false,
      actor: 'admin',
      actorLabel: 'Admin',
      adminId: payment.verifiedByAdminId ? String(payment.verifiedByAdminId) : null,
      note: payment.adminNote || '',
      fedapayEventId: '',
      fedapayEventName: '',
      metadata: { synthesized: true },
      createdAt: payment.refundResolvedAt || payment.verifiedAt || payment.updatedAt,
    })
  }

  return events
}
