import mongoose from 'mongoose'

export const SUBSCRIPTION_STATUSES = ['pending_payment', 'active', 'expired', 'cancelled']

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: 'pending_payment',
      index: true,
    },
    /** Snapshot des droits au moment de l’activation (ou de la souscription). */
    accessCode: { type: Boolean, default: false },
    accessConduite: { type: Boolean, default: false },
    accessECodepermis: { type: Boolean, default: false },
    heuresIncluses: { type: Number, default: 0, min: 0 },
    /** Snapshot figé : ce plan était une offre gratuite (prix 0, hors grâce) au moment de la souscription. */
    isFreeOffer: { type: Boolean, default: false },
    hoursCredited: { type: Boolean, default: false },
    expiryWarningSent: { type: Boolean, default: false },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null, index: true },
    activatedAt: { type: Date, default: null },
    activatedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    source: {
      type: String,
      enum: ['purchase', 'grace', 'admin'],
      default: 'purchase',
    },
    planName: { type: String, default: '' },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'XOF' },
    durationDays: { type: Number, default: 30 },
    paymentNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

userSubscriptionSchema.index({ userId: 1, status: 1 })

userSubscriptionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    planId: this.planId,
    planName: this.planName,
    status: this.status,
    accessCode: Boolean(this.accessCode),
    accessConduite: Boolean(this.accessConduite),
    accessECodepermis: Boolean(this.accessECodepermis),
    heuresIncluses: this.heuresIncluses || 0,
    isFreeOffer: Boolean(this.isFreeOffer),
    startAt: this.startAt,
    endAt: this.endAt,
    activatedAt: this.activatedAt,
    source: this.source,
    price: this.price || 0,
    currency: this.currency || 'XOF',
    durationDays: this.durationDays || 30,
    paymentNote: this.paymentNote || '',
    createdAt: this.createdAt,
  }
}

userSubscriptionSchema.methods.toAdminJSON = function toAdminJSON(user) {
  return {
    ...this.toPublicJSON(),
    userId: this.userId,
    user: user
      ? {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        }
      : null,
    activatedByAdminId: this.activatedByAdminId,
    hoursCredited: Boolean(this.hoursCredited),
    expiryWarningSent: Boolean(this.expiryWarningSent),
    updatedAt: this.updatedAt,
  }
}

export const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema)
