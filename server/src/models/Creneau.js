import mongoose from 'mongoose'

const creneauSchema = new mongoose.Schema(
  {
    moniteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Moniteur',
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    vehicleType: {
      type: String,
      default: 'voiture',
      trim: true,
    },
    status: {
      type: String,
      enum: ['libre', 'reserve', 'bloque'],
      default: 'libre',
      index: true,
    },
    priceFcfa: { type: Number, default: 5000 },
    lockedUntil: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

creneauSchema.index({ date: 1, moniteurId: 1, startTime: 1 }, { unique: true })

creneauSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    id: String(this._id),
    moniteurId: this.moniteurId ? String(this.moniteurId._id || this.moniteurId) : null,
    date: this.date,
    startTime: this.startTime,
    endTime: this.endTime,
    vehicleType: this.vehicleType,
    status: this.status,
    priceFcfa: this.priceFcfa || 0,
    lockedUntil: this.lockedUntil,
    createdAt: this.createdAt,
  }
}

export const Creneau = mongoose.model('Creneau', creneauSchema)
