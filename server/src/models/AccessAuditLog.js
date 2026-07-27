import mongoose from 'mongoose'

/**
 * Journal d'audit immuable des transitions d'AccessRequest.
 * IMPORTANT : n'exposer AUCUNE route PATCH/DELETE sur cette collection, jamais.
 * Seule une insertion (create) est légitime — l'historique ne doit jamais pouvoir
 * être réécrit après coup, c'est le fondement de sa valeur de preuve.
 */
const accessAuditLogSchema = new mongoose.Schema(
  {
    accessRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessRequest',
      required: true,
      index: true,
    },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, required: true },
    /** 'user' | 'system' | 'admin:<adminId>' */
    actor: { type: String, required: true },
    /** Nom affichable dénormalisé (évite un join pour l'affichage). */
    actorLabel: { type: String, default: '' },
    note: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

accessAuditLogSchema.index({ accessRequestId: 1, createdAt: 1 })

accessAuditLogSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    fromStatus: this.fromStatus || '',
    toStatus: this.toStatus,
    actor: this.actor,
    actorLabel: this.actorLabel || '',
    note: this.note || '',
    createdAt: this.createdAt,
  }
}

export const AccessAuditLog = mongoose.model('AccessAuditLog', accessAuditLogSchema)
