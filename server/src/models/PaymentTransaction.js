import mongoose from 'mongoose'

export const PAYMENT_STATUSES = [
  'pending',
  'approved',
  'declined',
  'canceled',
  'failed',
]

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSubscription',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    provider: { type: String, default: 'fedapay' },
    fedapayTransactionId: { type: String, default: '', index: true },
    fedapayReference: { type: String, default: '' },
    paymentUrl: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    lastEventName: { type: String, default: '' },
    processedEventIds: { type: [String], default: [] },
    errorMessage: { type: String, default: '' },
    rawLastEvent: { type: mongoose.Schema.Types.Mixed, default: null },
    activatedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

paymentTransactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    subscriptionId: this.subscriptionId,
    planId: this.planId,
    amount: this.amount,
    currency: this.currency || 'XOF',
    description: this.description || '',
    status: this.status,
    paymentUrl: this.paymentUrl || '',
    paymentMethod: this.paymentMethod || '',
    fedapayReference: this.fedapayReference || '',
    errorMessage: this.errorMessage || '',
    activatedAt: this.activatedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const PaymentTransaction = mongoose.model(
  'PaymentTransaction',
  paymentTransactionSchema,
)
