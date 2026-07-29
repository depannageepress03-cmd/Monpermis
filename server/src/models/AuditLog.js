import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String },
    /** Résumé avant/après + contexte (jamais de secrets). */
    metadata: { type: mongoose.Schema.Types.Mixed },
    /** Alias historique — conservé pour compatibilité. */
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ adminId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ resource: 1, createdAt: -1 })

auditLogSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    adminId: this.adminId ? String(this.adminId) : null,
    adminName: this.adminName,
    action: this.action,
    resource: this.resource,
    resourceId: this.resourceId || null,
    metadata: this.metadata ?? this.details ?? null,
    ip: this.ip || null,
    userAgent: this.userAgent || null,
    createdAt: this.createdAt,
  }
}

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
