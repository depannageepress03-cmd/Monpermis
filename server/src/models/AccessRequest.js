import mongoose from 'mongoose'
import { ACCESS_MODULES, ACCESS_MODULE_UNITS } from './AccessModulePricing.js'

export const ACCESS_REQUEST_STATUSES = [
  'en_attente',
  'paiement_declare',
  'en_verification',
  'valide',
  'actif',
  'expire',
  'rejete',
]

/** Modules temporels : ont un startAt/endAt et transitent valide -> actif -> expire. */
export const TIME_BASED_MODULES = ['code', 'conduite_videos', 'aiChat']
/** Modules à quantité : créditent un solde à `valide`, pas d'état actif/expire. */
export const QUANTITY_BASED_MODULES = ['conduite_heures']

const accessRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: ACCESS_MODULES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ACCESS_REQUEST_STATUSES,
      default: 'en_attente',
      index: true,
    },
    /** Heures (conduite_heures), semaines (conduite_videos), ou 1 pour les autres. */
    quantity: { type: Number, default: 1, min: 1 },
    /** Montant total figé à la création (quantity * prix unitaire au moment de l'achat). */
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
    unit: {
      type: String,
      enum: ACCESS_MODULE_UNITS,
      required: true,
    },
    /** Uniquement pour les modules temporels ; null pour conduite_heures. */
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null, index: true },
    /** Crédit d'heures déjà appliqué à soldeHeures (idempotence, conduite_heures uniquement). */
    hoursCredited: { type: Boolean, default: false },
    /** Note de la dernière décision (redondant avec l'audit log, pratique pour affichage rapide). */
    lastDecisionNote: { type: String, trim: true, default: '' },
    expiryWarningSent: { type: Boolean, default: false },
  },
  { timestamps: true },
)

accessRequestSchema.index({ userId: 1, module: 1, status: 1 })

accessRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    module: this.module,
    status: this.status,
    quantity: this.quantity,
    amount: this.amount,
    currency: this.currency || 'XOF',
    unit: this.unit,
    startAt: this.startAt,
    endAt: this.endAt,
    lastDecisionNote: this.lastDecisionNote || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

accessRequestSchema.methods.toAdminJSON = function toAdminJSON(user) {
  const learner = user && typeof user === 'object' ? user : null
  return {
    ...this.toPublicJSON(),
    userId: String(this.userId),
    learner: learner
      ? {
          id: learner._id,
          firstName: learner.firstName,
          lastName: learner.lastName,
          email: learner.email || '',
          phone: learner.phone || '',
        }
      : null,
    hoursCredited: Boolean(this.hoursCredited),
  }
}

export const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema)
