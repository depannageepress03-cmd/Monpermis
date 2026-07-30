import mongoose from 'mongoose'

export const PAYMENT_STATUSES = ['pending', 'approved', 'declined', 'canceled', 'failed']
export const PAYMENT_METHODS = ['fedapay', 'manual']

const paymentSchema = new mongoose.Schema(
  {
    /** Absent pour un paiement de réservation (voir reservationGroupId ci-dessous). */
    accessRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessRequest',
      default: null,
      index: true,
    },
    /** Toutes les demandes couvertes par ce paiement (panier multi-offres). */
    accessRequestIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AccessRequest' }],
      default: [],
      index: true,
    },
    /** Regroupe les Reservation payées ensemble (paiement à la réservation, chemin parallèle aux AccessRequest). */
    reservationGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true,
    },

    // --- FedaPay (method: 'fedapay') ---
    fedapayTransactionId: { type: String, default: '', index: true },
    fedapayReference: { type: String, default: '' },
    paymentUrl: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    lastEventName: { type: String, default: '' },
    processedEventIds: { type: [String], default: [] },
    rawLastEvent: { type: mongoose.Schema.Types.Mixed, default: null },

    // --- Déclaration manuelle hors plateforme (method: 'manual') ---
    declaredReference: { type: String, default: '', trim: true },
    declaredAt: { type: Date, default: null },
    verifiedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    /** Note admin — obligatoire au moment de la décision (validée côté route). */
    adminNote: { type: String, default: '', trim: true },

    errorMessage: { type: String, default: '' },
    activatedAt: { type: Date, default: null },
    /**
     * True when FedaPay reports approved after we already canceled/superseded locally,
     * or when approved but no access/reservation could be delivered — admin must refund.
     */
    needsRefund: { type: Boolean, default: false, index: true },
    /** Date à laquelle un admin a marqué le remboursement hors plateforme comme traité. */
    refundResolvedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

paymentSchema.methods.linkedRequestIds = function linkedRequestIds() {
  const ids = Array.isArray(this.accessRequestIds) ? this.accessRequestIds.filter(Boolean) : []
  if (ids.length > 0) return ids
  return this.accessRequestId ? [this.accessRequestId] : []
}

paymentSchema.methods.toPublicJSON = function toPublicJSON() {
  const linked = this.linkedRequestIds().map((id) => String(id))
  return {
    id: this._id,
    accessRequestId: this.accessRequestId,
    accessRequestIds: linked,
    reservationGroupId: this.reservationGroupId ? String(this.reservationGroupId) : null,
    method: this.method,
    amount: this.amount,
    currency: this.currency || 'XOF',
    status: this.status,
    paymentUrl: this.paymentUrl || '',
    paymentMethod: this.paymentMethod || '',
    fedapayReference: this.fedapayReference || '',
    declaredReference: this.declaredReference || '',
    declaredAt: this.declaredAt,
    errorMessage: this.errorMessage || '',
    activatedAt: this.activatedAt,
    needsRefund: Boolean(this.needsRefund),
    refundResolvedAt: this.refundResolvedAt || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

/** Vue admin : ajoute l'identité de l'apprenant et de l'admin vérificateur. */
paymentSchema.methods.toAdminJSON = function toAdminJSON(user, verifierAdmin) {
  const learner = user && typeof user === 'object' ? user : null
  const verifier = verifierAdmin && typeof verifierAdmin === 'object' ? verifierAdmin : null
  return {
    ...this.toPublicJSON(),
    userId: String(this.userId),
    learner: learner
      ? {
          id: learner._id,
          firstName: learner.firstName,
          lastName: learner.lastName,
          email: learner.email || '',
          phone: learner.phone || '',
        }
      : null,
    verifiedByAdmin: verifier ? { id: verifier._id, fullName: verifier.fullName } : null,
    verifiedAt: this.verifiedAt,
    adminNote: this.adminNote || '',
    needsRefund: Boolean(this.needsRefund),
    refundResolvedAt: this.refundResolvedAt || null,
    fedapayTransactionId: this.fedapayTransactionId || '',
    lastEventName: this.lastEventName || '',
    processedEventIds: Array.isArray(this.processedEventIds) ? this.processedEventIds : [],
  }
}

export const Payment = mongoose.model('Payment', paymentSchema)
