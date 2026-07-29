import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    /** Texte brut ou HTML TipTap sanitizé. */
    body: { type: String, default: '', trim: true },
    /** Catégorie d’affichage (info, promo, alerte). */
    kind: {
      type: String,
      enum: ['info', 'promo', 'alerte'],
      default: 'info',
    },
    /**
     * Cible de diffusion / affichage :
     * all | active (abonnés) | code | conduite
     */
    audience: {
      type: String,
      enum: ['all', 'active', 'code', 'conduite'],
      default: 'all',
      index: true,
    },
    active: { type: Boolean, default: false, index: true },
    /** Programmation : activation automatique (cron 15 min). */
    scheduledAt: { type: Date, default: null, index: true },
    /** Expiration : dépublication automatique. */
    expiresAt: { type: Date, default: null, index: true },
    /** Lien CTA optionnel (http(s) ou chemin relatif). */
    ctaUrl: { type: String, default: '', trim: true },
    /** Image Cloudinary optionnelle. */
    imageUrl: { type: String, default: '', trim: true },
    imagePublicId: { type: String, default: '', trim: true },
    /** Compteur d’impressions / vues (approximatif). */
    viewCount: { type: Number, default: 0, min: 0 },
    /** Renseigné lorsqu’une diffusion en notification a été envoyée. */
    broadcastAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
)

announcementSchema.index({ active: 1, createdAt: -1 })
announcementSchema.index({ active: 1, audience: 1, createdAt: -1 })

announcementSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    title: this.title,
    body: this.body,
    kind: this.kind,
    audience: this.audience || 'all',
    ctaUrl: this.ctaUrl || '',
    imageUrl: this.imageUrl || '',
    createdAt: this.createdAt,
    expiresAt: this.expiresAt || null,
  }
}

announcementSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    active: this.active,
    scheduledAt: this.scheduledAt || null,
    broadcastAt: this.broadcastAt,
    viewCount: this.viewCount || 0,
    imagePublicId: this.imagePublicId || '',
    updatedAt: this.updatedAt,
  }
}

export const Announcement = mongoose.model('Announcement', announcementSchema)
