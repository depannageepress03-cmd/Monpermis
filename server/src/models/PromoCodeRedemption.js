import mongoose from 'mongoose'

const promoCodeRedemptionSchema = new mongoose.Schema(
  {
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

/** Un élève ne peut utiliser un même code promo qu'une seule fois. */
promoCodeRedemptionSchema.index({ promoCodeId: 1, userId: 1 }, { unique: true })

export const PromoCodeRedemption = mongoose.model('PromoCodeRedemption', promoCodeRedemptionSchema)
