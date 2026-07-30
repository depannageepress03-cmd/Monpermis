import { Router } from 'express'
import { Admin, ADMIN_ROLES } from '../models/Admin.js'
import { AuditLog } from '../models/AuditLog.js'
import {
  invalidateSuperAdminCache,
  requireAdminAuth,
  requireSuperAdmin,
} from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { assertNotLastActiveSuperAdmin } from '../utils/bootstrapSuperAdmin.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth, requireSuperAdmin)

const PASSWORD_MIN = 8

function toAdminListJSON(admin) {
  return {
    id: String(admin._id),
    fullName: admin.fullName,
    phone: admin.phone,
    role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
    isActive: Boolean(admin.isActive),
    lastLoginAt: admin.lastLoginAt || null,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

function validatePassword(password) {
  if (!password || String(password).length < PASSWORD_MIN) {
    return 'Mot de passe : minimum 8 caractères'
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Mot de passe : doit contenir majuscule, minuscule et chiffre'
  }
  return null
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

/**
 * Mise à jour : activer / désactiver, rôle, mot de passe.
 * Réservé aux superadmins. Ne peut pas rétrograder / désactiver le dernier superadmin.
 */
router.patch('/:adminId', audit('update', 'admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.adminId).select('+password')
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrateur introuvable' })
    }

    const { isActive, role, password } = req.body ?? {}
    const before = {
      isActive: admin.isActive,
      role: admin.role,
      passwordChanged: false,
    }

    let nextRole
    let nextActive

    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Rôle invalide (admin ou superadmin)',
        })
      }
      nextRole = role
    }

    if (isActive !== undefined) {
      nextActive = Boolean(isActive)
    }

    try {
      await assertNotLastActiveSuperAdmin(admin, { nextRole, nextActive })
    } catch (guardErr) {
      return res.status(guardErr.status || 400).json({
        success: false,
        error: guardErr.message,
      })
    }

    if (nextRole !== undefined) admin.role = nextRole
    if (nextActive !== undefined) admin.isActive = nextActive

    if (password !== undefined && password !== '') {
      const pwdError = validatePassword(password)
      if (pwdError) {
        return res.status(400).json({ success: false, error: pwdError })
      }
      admin.password = password
      admin.failedLoginAttempts = 0
      admin.lockUntil = undefined
      before.passwordChanged = true
    }

    await admin.save()
    invalidateSuperAdminCache()

    res.json({
      success: true,
      data: {
        admin: toAdminListJSON(admin),
        before,
        after: {
          isActive: admin.isActive,
          role: admin.role,
          passwordChanged: Boolean(password),
        },
      },
    })
  } catch (error) {
    logger.error('Erreur mise à jour admin', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

export default router
