import { Router } from 'express'
import { Admin } from '../models/Admin.js'
import { AuditLog } from '../models/AuditLog.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

function toAdminListJSON(admin) {
  return {
    id: String(admin._id),
    fullName: admin.fullName,
    phone: admin.phone,
    role: 'admin',
    isActive: Boolean(admin.isActive),
    lastLoginAt: admin.lastLoginAt || null,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

/** Liste de tous les administrateurs. */
router.get('/', async (_req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 }).select('-password')
    res.json({
      success: true,
      data: { admins: admins.map(toAdminListJSON) },
    })
  } catch (error) {
    logger.error('Erreur liste admins', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Détail d’un admin + dernières actions. */
router.get('/:adminId', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.adminId).select('-password')
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrateur introuvable' })
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40))
    const logs = await AuditLog.find({ adminId: admin._id })
      .sort({ createdAt: -1 })
      .limit(limit)

    res.json({
      success: true,
      data: {
        admin: toAdminListJSON(admin),
        recentActions: logs.map((log) => log.toPublicJSON()),
      },
    })
  } catch (error) {
    logger.error('Erreur détail admin', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
