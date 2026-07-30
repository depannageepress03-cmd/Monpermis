import mongoose from 'mongoose'

/** Événements immuables de la piste d’audit financière. */
export const LEDGER_EVENT_TYPES = [
  'created',
  'approved',
  'failed',
  'declined',
  'canceled',
  'needs_refund',
  'refund_resolved',
  'note',
]

export const LEDGER_KINDS = ['abonnement', 'reservation', 'autre']

const paymentLedgerEntrySchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    kind: {
      type: String,
      enum: LEDGER_KINDS,
      default: 'autre',
      index: true,
    },
    eventType: {
      type: String,
      enum: LEDGER_EVENT_TYPES,
      required: true,
      index: true,
    },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    needsRefund: { type: Boolean, default: false },
    actor: {
      type: String,
      enum: ['system', 'user', 'admin', 'fedapay'],
      default: 'system',
    },
    actorLabel: { type: String, default: '' },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    note: { type: String, default: '', trim: true },
    fedapayEventId: { type: String, default: '' },
    fedapayEventName: { type: String, default: '' },
    /** Clé d’idempotence (ex. paymentId:approved:eventId) — unique sparse. */
    idempotencyKey: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    /** Pas de mise à jour : journal append-only. */
    versionKey: false,
  },
)

paymentLedgerEntrySchema.index({ createdAt: -1 })
paymentLedgerEntrySchema.index({ paymentId: 1, createdAt: 1 })
paymentLedgerEntrySchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
)

paymentLedgerEntrySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    paymentId: String(this.paymentId),
    userId: this.userId ? String(this.userId) : null,
    kind: this.kind,
    eventType: this.eventType,
    fromStatus: this.fromStatus || '',
    toStatus: this.toStatus || '',
    amount: this.amount,
    currency: this.currency || 'XOF',
    needsRefund: Boolean(this.needsRefund),
    actor: this.actor,
    actorLabel: this.actorLabel || '',
    adminId: this.adminId ? String(this.adminId) : null,
    note: this.note || '',
    fedapayEventId: this.fedapayEventId || '',
    fedapayEventName: this.fedapayEventName || '',
    metadata: this.metadata ?? null,
    createdAt: this.createdAt,
  }
}

export const PaymentLedgerEntry = mongoose.model('PaymentLedgerEntry', paymentLedgerEntrySchema)
