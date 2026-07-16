import mongoose from 'mongoose'

export const DURATION_TYPES = ['monthly', 'quarterly', 'semiannual', 'yearly', 'custom']
export const CUSTOM_DURATION_UNITS = ['days', 'months']

export function durationDaysFor(type, customDays = 0, customUnit = 'days') {
  switch (type) {
    case 'monthly':
      return 30
    case 'quarterly':
      return 90
    case 'semiannual':
      return 180
    case 'yearly':
      return 365
    case 'custom': {
      const amount = Math.max(1, Number(customDays) || 1)
      return customUnit === 'months' ? amount * 30 : amount
    }
    default:
      return 30
  }
}

export function durationLabel(type, customDays = 0, customUnit = 'days') {
  switch (type) {
    case 'monthly':
      return 'Mensuel'
    case 'quarterly':
      return 'Trimestriel'
    case 'semiannual':
      return 'Semestriel'
    case 'yearly':
      return 'Annuel'
    case 'custom': {
      const amount = Math.max(1, Number(customDays) || 1)
      return customUnit === 'months'
        ? `${amount} mois`
        : `${amount} jour(s)`
    }
    default:
      return type
  }
}

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    durationType: {
      type: String,
      enum: DURATION_TYPES,
      required: true,
      default: 'monthly',
    },
    customDays: { type: Number, min: 1, default: 30 },
    customUnit: { type: String, enum: CUSTOM_DURATION_UNITS, default: 'days' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    accessCode: { type: Boolean, default: false },
    accessConduite: { type: Boolean, default: false },
    accessECodepermis: { type: Boolean, default: false },
    heuresIncluses: { type: Number, default: 0, min: 0 },
    /** Visible au catalogue élève si actif et non-grâce. */
    active: { type: Boolean, default: true },
    /** Plan système pour période de grâce (non listé aux élèves). */
    isGracePlan: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

subscriptionPlanSchema.methods.getDurationDays = function getDurationDays() {
  return durationDaysFor(this.durationType, this.customDays, this.customUnit)
}

subscriptionPlanSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    durationType: this.durationType,
    customDays: this.customDays,
    customUnit: this.customUnit || 'days',
    durationDays: this.getDurationDays(),
    durationLabel: durationLabel(this.durationType, this.customDays, this.customUnit),
    price: this.price,
    isFreeOffer: (Number(this.price) || 0) <= 0 && !this.isGracePlan,
    currency: this.currency || 'XOF',
    accessCode: Boolean(this.accessCode),
    accessConduite: Boolean(this.accessConduite),
    accessECodepermis: Boolean(this.accessECodepermis),
    heuresIncluses: this.heuresIncluses || 0,
    active: this.active !== false,
    isGracePlan: Boolean(this.isGracePlan),
    order: this.order ?? 0,
  }
}

subscriptionPlanSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
