import mongoose from 'mongoose'

export const PROMO_ELIGIBLE_MODULES = ['code', 'conduite_heures', 'aiChat']
/** Modules encore proposés dans les nouveaux codes promo. */
export const PROMO_CREATABLE_MODULES = ['code', 'conduite_heures']
export const PROMO_DURATION_UNITS = ['day', 'week', 'month']

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    /** Note interne admin, jamais affichée à l'élève. */
    label: { type: String, default: '', trim: true },
    modules: {
      type: [{ type: String, enum: PROMO_ELIGIBLE_MODULES }],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Sélectionnez au moins un module',
      },
    },
    /** Durée accordée aux modules temporels (code, aiChat). */
    durationQuantity: { type: Number, default: 1, min: 1 },
    durationUnit: { type: String, enum: PROMO_DURATION_UNITS, default: 'month' },
    /** Heures créditées si 'conduite_heures' fait partie des modules. */
    heuresBonus: { type: Number, default: 0, min: 0 },
    /** null = pas de limite sur le nombre d'élèves. */
    maxUses: { type: Number, default: null, min: 1 },
    usesCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true },
)

promoCodeSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: String(this._id),
    code: this.code,
    label: this.label || '',
    modules: this.modules || [],
    durationQuantity: this.durationQuantity,
    durationUnit: this.durationUnit,
    heuresBonus: this.heuresBonus || 0,
    maxUses: this.maxUses ?? null,
    usesCount: this.usesCount || 0,
    active: this.active !== false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const PromoCode = mongoose.model('PromoCode', promoCodeSchema)
