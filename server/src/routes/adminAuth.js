import { Router } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { DUMMY_BCRYPT_HASH, passwordPolicyError } from '../middleware/security.js'
import { Admin, ADMIN_ROLES } from '../models/Admin.js'
import {
  hasActiveSuperAdmin,
  invalidateSuperAdminCache,
  requireAdminAuth,
  requireSuperAdmin,
} from '../middleware/adminAuth.js'
import { audit, logAdminAction } from '../middleware/audit.js'
import { adminLoginLimiter } from '../middleware/rateLimiters.js'
import { isFedaPayConfigured } from '../services/fedapay.js'
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

function createAdminToken(admin) {
  return jwt.sign(
    {
      adminId: String(admin._id),
      scope: 'admin',
      role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
      sv: admin.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h',
      algorithm: 'HS256',
      issuer: 'monpermis',
      audience: 'admin',
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

      const pwdError = passwordPolicyError(password)
      if (pwdError) {
        return res.status(400).json({ success: false, error: pwdError })
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

router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body

    if (typeof phone !== 'string' || typeof password !== 'string' || !phone || !password) {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' })
    }

    const normalizedPhone = normalizePhone(phone)
    const admin = await Admin.findOne({ phone: normalizedPhone }).select('+password')

    if (!admin || !admin.isActive) {
      await bcrypt.compare(String(password), DUMMY_BCRYPT_HASH)
      logger.warn('Connexion admin refusée (compte inconnu ou inactif)', { ip: req.ip })
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
    }

    const valid = await admin.comparePassword(password)
    if (!valid) {
      if (!admin.isLocked()) await admin.registerFailedLogin()
      logger.warn('Connexion admin refusée (mot de passe)', { ip: req.ip, adminId: String(admin._id) })
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
    }

    if (admin.isLocked()) {
      logger.warn('Connexion admin refusée (compte verrouillé)', { ip: req.ip, adminId: String(admin._id) })
      return res.status(429).json({
        success: false,
        error: 'Compte temporairement verrouillé. Réessayez dans quelques minutes.',
      })
    }

    await admin.resetFailedLogins()
    const token = createAdminToken(admin)

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

router.post('/logout', requireAdminAuth, async (req, res) => {
  try {
    await Admin.updateOne({ _id: req.admin._id }, { $inc: { sessionVersion: 1 } })
    res.json({ success: true, data: { ok: true } })
  } catch (error) {
    logger.error('Erreur déconnexion admin:', error)
    res.status(500).json({ success: false, error: 'Déconnexion impossible' })
  }
})

router.get('/ops-status', requireAdminAuth, requireSuperAdmin, async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1
  res.json({
    success: true,
    data: {
      db: dbReady ? 'connected' : 'disconnected',
      fedapay: isFedaPayConfigured() ? 'configured' : 'missing',
      fedapayEnvironment: process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live',
      fedapayWebhookSecret: String(process.env.FEDAPAY_WEBHOOK_SECRET || '').trim()
        ? 'configured'
        : 'missing',
    },
  })
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
