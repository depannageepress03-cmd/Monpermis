import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' },
  },
  { _id: false },
)

export const MONITEUR_BIO_MAX = 2000
export const MONITEUR_PHOTOS_MAX = 12
export const MONITEUR_VIDEOS_MAX = 6

const moniteurSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    /** Identifiants portail moniteur (optionnels tant que activeLogin=false). */
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, default: '', select: false },
    activeLogin: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
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
    /** Photo du moniteur lui-même (portrait), distincte de la photo du véhicule. */
    photoUrl: { type: String, default: '' },
    /** Ville / zone où le moniteur intervient — critère de choix pour l'élève. */
    city: { type: String, default: '', trim: true },
    /** Présentation du moniteur affichée sur son profil public. */
    bio: { type: String, default: '', trim: true, maxlength: MONITEUR_BIO_MAX },
    /** Galerie de photos du moniteur (URLs). */
    photos: { type: [String], default: [] },
    /** Vidéos de présentation (URLs YouTube / Vimeo). */
    videos: { type: [String], default: [] },
  },
  { timestamps: true },
)

moniteurSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $gt: '' } },
  },
)

moniteurSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(String(plain), 12)
}

moniteurSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false)
  return bcrypt.compare(String(candidate || ''), this.passwordHash)
}

/** Admin only — includes phone, login flags and full scheduling data (never passwordHash). */
moniteurSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    id: String(this._id),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`.trim(),
    phone: this.phone || '',
    email: this.email || '',
    activeLogin: Boolean(this.activeLogin),
    hasPassword: Boolean(this.passwordHash),
    lastLoginAt: this.lastLoginAt || null,
    specialties: this.specialties || [],
    vehicleTypes: this.vehicleTypes || [],
    weeklyAvailability: this.weeklyAvailability || [],
    active: Boolean(this.active),
    defaultPriceFcfa: this.defaultPriceFcfa || 5000,
    vehicleBrand: this.vehicleBrand || '',
    vehiclePhotoUrl: this.vehiclePhotoUrl || '',
    photoUrl: this.photoUrl || '',
    city: this.city || '',
    bio: this.bio || '',
    photos: this.photos || [],
    videos: this.videos || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

/** Session portail moniteur. */
moniteurSchema.methods.toAuthJSON = function toAuthJSON() {
  return {
    id: String(this._id),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`.trim(),
    email: this.email || '',
    phone: this.phone || '',
    activeLogin: Boolean(this.activeLogin),
    photoUrl: this.photoUrl || '',
    city: this.city || '',
  }
}

/** Learner list card — no phone, no heavy media payloads. */
moniteurSchema.methods.toPublicListJSON = function toPublicListJSON() {
  return {
    id: String(this._id),
    fullName: `${this.firstName} ${this.lastName}`.trim(),
    vehicleTypes: this.vehicleTypes || [],
    defaultPriceFcfa: this.defaultPriceFcfa || 5000,
    vehicleBrand: this.vehicleBrand || '',
    vehiclePhotoUrl: this.vehiclePhotoUrl || '',
    photoUrl: this.photoUrl || '',
    city: this.city || '',
  }
}

/** Learner profile page — no phone. */
moniteurSchema.methods.toPublicProfileJSON = function toPublicProfileJSON() {
  return {
    ...this.toPublicListJSON(),
    specialties: this.specialties || [],
    bio: this.bio || '',
    photos: this.photos || [],
    videos: this.videos || [],
  }
}

export const Moniteur = mongoose.model('Moniteur', moniteurSchema)
