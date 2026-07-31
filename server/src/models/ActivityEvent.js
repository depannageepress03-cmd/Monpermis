import mongoose from 'mongoose'

/**
 * Fil d’activité unifié (apprenants + admins + système).
 * Append-only — source pour le cockpit superadmin temps réel.
 */
const activityEventSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['admin', 'user', 'system'],
      required: true,
      index: true,
    },
    actorId: { type: String, default: null, index: true },
    actorName: { type: String, default: '', trim: true },
    action: { type: String, required: true, trim: true, index: true },
    resource: { type: String, required: true, trim: true, index: true },
    resourceId: { type: String, default: null },
    summary: { type: String, default: '', trim: true, maxlength: 400 },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'danger'],
      default: 'info',
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

activityEventSchema.index({ createdAt: -1 })
activityEventSchema.index({ actorType: 1, createdAt: -1 })
activityEventSchema.index({ action: 1, createdAt: -1 })

activityEventSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    actorType: this.actorType,
    actorId: this.actorId || null,
    actorName: this.actorName || '',
    action: this.action,
    resource: this.resource,
    resourceId: this.resourceId || null,
    summary: this.summary || '',
    severity: this.severity || 'info',
    metadata: this.metadata ?? null,
    ip: this.ip || null,
    userAgent: this.userAgent || null,
    createdAt: this.createdAt,
  }
}

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema)
