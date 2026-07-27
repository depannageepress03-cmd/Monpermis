import mongoose from 'mongoose'

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
  return {
    key: this.key,
    label: this.label,
    unit: this.unit,
    price: this.price,
    currency: this.currency || 'XOF',
    active: this.active !== false,
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
