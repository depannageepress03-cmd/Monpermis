import mongoose from 'mongoose'
import { computeDrivingAmount, HOURS_DISCOUNT_FCFA } from '../utils/pricing.js'

export const ACCESS_MODULES = ['code', 'conduite_heures', 'conduite_videos', 'ecodepermis', 'aiChat']
export const ACCESS_MODULE_UNITS = ['flat', 'month', 'hour', 'week']

const accessModulePricingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ACCESS_MODULES,
      required: true,
      unique: true,
    },
    label: { type: String, required: true, trim: true },
    unit: {
      type: String,
      enum: ACCESS_MODULE_UNITS,
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

accessModulePricingSchema.methods.toPublicJSON = function toPublicJSON() {
  const price = this.price
  return {
    key: this.key,
    label: this.label,
    unit: this.unit,
    price,
    currency: this.currency || 'XOF',
    active: this.active !== false,
    /** Montant pour 1 unité (après règles métier éventuelles). */
    amountForOne: this.key === 'conduite_heures' ? price : price,
    /** Exemple 2 heures avec remise −1000. */
    amountForTwoHours: this.key === 'conduite_heures' ? computeDrivingAmount(price, 2) : null,
    hoursDiscount: this.key === 'conduite_heures' ? HOURS_DISCOUNT_FCFA : 0,
  }
}

accessModulePricingSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const AccessModulePricing = mongoose.model('AccessModulePricing', accessModulePricingSchema)
