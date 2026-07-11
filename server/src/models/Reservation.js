import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    moniteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Moniteur',
      required: true,
    },
    creneauId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creneau',
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      default: 'voiture',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'cancelled', 'completed'],
      default: 'pending_payment',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_validation', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentRef: { type: String, default: '', trim: true },
    priceFcfa: { type: Number, default: 0 },
    reminderSentAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    /** Motif d’annulation fourni par l’élève (ou l’admin). */
    cancellationReason: { type: String, default: '', trim: true },
    cancelledBy: {
      type: String,
      enum: ['', 'learner', 'admin'],
      default: '',
    },
  },
  { timestamps: true },
)

/** Un seul créneau actif réservé à la fois — les annulées restent en historique. */
reservationSchema.index(
  { creneauId: 1 },
  {
    unique: true,
    name: 'creneauId_active_unique',
    partialFilterExpression: {
      status: { $in: ['pending_payment', 'confirmed'] },
    },
  },
)

function refId(value) {
  if (value == null) return null
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

reservationSchema.methods.toJSONSafe = function toJSONSafe(extras = {}) {
  return {
    id: String(this._id),
    userId: refId(this.userId),
    moniteurId: refId(this.moniteurId),
    creneauId: refId(this.creneauId),
    vehicleType: this.vehicleType,
    status: this.status,
    paymentStatus: this.paymentStatus,
    paymentRef: this.paymentRef || '',
    priceFcfa: this.priceFcfa || 0,
    reminderSentAt: this.reminderSentAt,
    cancelledAt: this.cancelledAt,
    cancellationReason: this.cancellationReason || '',
    cancelledBy: this.cancelledBy || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    ...extras,
  }
}

export const Reservation = mongoose.model('Reservation', reservationSchema)

/** Migre l’ancien index unique strict vers l’index partiel (actif uniquement). */
export async function ensureReservationIndexes() {
  try {
    const indexes = await Reservation.collection.indexes()
    const legacy = indexes.find(
      (idx) =>
        idx.name === 'creneauId_1' &&
        idx.unique &&
        !idx.partialFilterExpression,
    )
    if (legacy?.name) {
      await Reservation.collection.dropIndex(legacy.name)
    }
  } catch (error) {
    if (error?.code !== 27 && error?.codeName !== 'IndexNotFound') {
      console.warn('Index réservations (drop legacy):', error.message)
    }
  }
  try {
    await Reservation.syncIndexes()
  } catch (error) {
    console.warn('Index réservations (sync):', error.message)
  }
}
