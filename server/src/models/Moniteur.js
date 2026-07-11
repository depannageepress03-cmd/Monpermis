import mongoose from 'mongoose'

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' },
  },
  { _id: false },
)

const moniteurSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    specialties: { type: [String], default: [] },
    vehicleTypes: {
      type: [String],
      default: ['voiture'],
    },
    weeklyAvailability: { type: [availabilitySlotSchema], default: [] },
    active: { type: Boolean, default: true },
    defaultPriceFcfa: { type: Number, default: 5000 },
    /** Marque du véhicule d'apprentissage (ex. Toyota Corolla). */
    vehicleBrand: { type: String, default: '', trim: true },
    /** Photo du véhicule. */
    vehiclePhotoUrl: { type: String, default: '' },
  },
  { timestamps: true },
)

moniteurSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    id: String(this._id),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`.trim(),
    phone: this.phone || '',
    specialties: this.specialties || [],
    vehicleTypes: this.vehicleTypes || [],
    weeklyAvailability: this.weeklyAvailability || [],
    active: Boolean(this.active),
    defaultPriceFcfa: this.defaultPriceFcfa || 5000,
    vehicleBrand: this.vehicleBrand || '',
    vehiclePhotoUrl: this.vehiclePhotoUrl || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const Moniteur = mongoose.model('Moniteur', moniteurSchema)
