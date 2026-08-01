import { Router } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Admin, ADMIN_ROLES } from '../models/Admin.js'
import {
  hasActiveSuperAdmin,
  invalidateSuperAdminCache,
  requireAdminAuth,
  requireSuperAdmin,
} from '../middleware/adminAuth.js'
import { audit, logAdminAction } from '../middleware/audit.js'
import { logger } from '../utils/logger.js'

const router = Router()

const PHONE_PATTERN = /^\d{10}$/

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '')
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) {
    local = digits.slice(3)
  }
  return local.slice(0, 10)
}

function createAdminToken(adminId, role) {
  return jwt.sign(
    {
      adminId,
      scope: 'admin',
      role: role === 'superadmin' ? 'superadmin' : 'admin',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h',
      algorithm: 'HS256',
    },
  )
}

function isRegistrationAllowed() {
  return process.env.ALLOW_ADMIN_REGISTRATION === 'true'
}

router.get('/registration-status', requireAdminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const gated = await hasActiveSuperAdmin()
    // Superadmin : toujours autorisé à créer. Sinon (migration) : env.
    const allowed = gated ? req.admin.role === 'superadmin' : isRegistrationAllowed()
    res.json({ success: true, data: { allowed } })
  } catch {
    res.json({ success: true, data: { allowed: isRegistrationAllowed() } })
  }
})

router.post(
  '/register',
  requireAdminAuth,
  requireSuperAdmin,
  audit('create', 'admin'),
  async (req, res) => {
    try {
      const gated = await hasActiveSuperAdmin()
      if (gated) {
        if (req.admin.role !== 'superadmin') {
          return res.status(403).json({
            success: false,
            error: 'Accès réservé aux super-administrateurs',
          })
        }
      } else if (!isRegistrationAllowed()) {
        return res.status(403).json({
          success: false,
          error: "Création d'administrateur désactivée",
        })
      }

      const { fullName, phone, password, confirmPassword, role } = req.body

      if (!fullName?.trim() || !phone || !password) {
        return res.status(400).json({ success: false, error: 'Nom, téléphone et mot de passe requis' })
      }

      if (fullName.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Nom trop court' })
      }

      const normalizedPhone = normalizePhone(phone)
      if (!PHONE_PATTERN.test(normalizedPhone)) {
        return res.status(400).json({ success: false, error: 'Numéro invalide. Exemple : 0147880143' })
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Mot de passe : minimum 8 caractères' })
      }

      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe : doit contenir majuscule, minuscule et chiffre',
        })
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Les mots de passe ne correspondent pas' })
      }

      let assignedRole = 'admin'
      if (role !== undefined && role !== null && role !== '') {
        if (!ADMIN_ROLES.includes(role)) {
          return res.status(400).json({
            success: false,
            error: 'Rôle invalide (admin ou superadmin)',
          })
        }
        if (role === 'superadmin' && req.admin.role !== 'superadmin') {
          return res.status(403).json({
            success: false,
            error: 'Seul un super-administrateur peut promouvoir ce rôle',
          })
        }
        assignedRole = role
      }

      const existing = await Admin.findOne({ phone: normalizedPhone })
      if (existing) {
        return res.status(409).json({ success: false, error: 'Ce numéro est déjà utilisé' })
      }

      const admin = await Admin.create({
        fullName: fullName.trim(),
        phone: normalizedPhone,
        password,
        role: assignedRole,
      })

      if (assignedRole === 'superadmin') {
        invalidateSuperAdminCache()
      }

      res.status(201).json({
        success: true,
        data: {
          admin: admin.toPublicJSON(),
        },
      })
    } catch (error) {
      logger.error('Erreur création admin:', error)
      res.status(500).json({ success: false, error: 'Création impossible' })
    }
  },
)

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' })
    }

    const normalizedPhone = normalizePhone(phone)
    const admin = await Admin.findOne({ phone: normalizedPhone }).select('+password')

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
    }

    if (admin.isLocked()) {
      return res.status(429).json({
        success: false,
        error: 'Compte temporairement verrouillé. Réessayez dans quelques minutes.',
      })
    }

    const valid = await admin.comparePassword(password)
    if (!valid) {
      await admin.registerFailedLogin()
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
    }

    await admin.resetFailedLogins()
    const token = createAdminToken(admin._id, admin.role)

    logAdminAction(req, {
      action: 'login',
      resource: 'admin',
      resourceId: String(admin._id),
      admin,
      metadata: {
        phone: admin.phone,
        role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
      },
    })

    res.json({
      success: true,
      data: {
        admin: admin.toPublicJSON(),
        token,
        homePath: admin.role === 'superadmin' ? '/cockpit' : '/',
      },
    })
  } catch (error) {
    logger.error('Erreur connexion admin:', error)
    const dbDown =
      error?.name === 'MongooseServerSelectionError' ||
      error?.name === 'MongoServerSelectionError' ||
      mongoose.connection.readyState !== 1
    if (dbDown) {
      return res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible. R\u00e9essayez plus tard.',
      })
    }
    res.status(500).json({ success: false, error: 'Connexion impossible' })
  }
})

router.get('/me', requireAdminAuth, async (req, res) => {
  try {
    const gated = await hasActiveSuperAdmin()
    const manageAdmins = !gated || req.admin.role === 'superadmin'
    res.json({
      success: true,
      data: {
        admin: req.admin.toPublicJSON(),
        capabilities: {
          /** Gestion admins, journal d’audit, finances, activité live */
          manageAdmins,
          viewFinances: manageAdmins,
          viewActivity: manageAdmins,
          manageRefunds: manageAdmins,
        },
      },
    })
  } catch {
    const manageAdmins = req.admin.role === 'superadmin'
    res.json({
      success: true,
      data: {
        admin: req.admin.toPublicJSON(),
        capabilities: {
          manageAdmins,
          viewFinances: manageAdmins,
          viewActivity: manageAdmins,
          manageRefunds: manageAdmins,
        },
      },
    })
  }
})

export default router
