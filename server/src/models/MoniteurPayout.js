import mongoose from 'mongoose'

/**
 * Versement admin → moniteur (hors ledger apprenant).
 * Les gains dus = somme des Reservation completed.priceFcfa − somme des payouts.
 */
const moniteurPayoutSchema = new mongoose.Schema(
  {
    moniteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Moniteur',
      required: true,
      index: true,
    },
    amountFcfa: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, default: Date.now },
    note: { type: String, default: '', trim: true },
    periodLabel: { type: String, default: '', trim: true },
    createdByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true },
)

moniteurPayoutSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    id: String(this._id),
    moniteurId: this.moniteurId ? String(this.moniteurId) : null,
    amountFcfa: Number(this.amountFcfa) || 0,
    paidAt: this.paidAt || this.createdAt || null,
    note: this.note || '',
    periodLabel: this.periodLabel || '',
    createdByAdminId: this.createdByAdminId ? String(this.createdByAdminId) : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const MoniteurPayout = mongoose.model('MoniteurPayout', moniteurPayoutSchema)
