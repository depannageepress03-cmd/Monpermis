import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    /** Catégorie d’affichage (info, promo, alerte). */
    kind: {
      type: String,
      enum: ['info', 'promo', 'alerte'],
      default: 'info',
    },
    active: { type: Boolean, default: true, index: true },
    /** Renseigné lorsqu’une diffusion en notification a été envoyée. */
    broadcastAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
)

announcementSchema.index({ active: 1, createdAt: -1 })

announcementSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    title: this.title,
    body: this.body,
    kind: this.kind,
    createdAt: this.createdAt,
  }
}

announcementSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    active: this.active,
    broadcastAt: this.broadcastAt,
    updatedAt: this.updatedAt,
  }
}

export const Announcement = mongoose.model('Announcement', announcementSchema)
