import { Router } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'

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

function createAdminToken(adminId) {
  return jwt.sign({ adminId, scope: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' })
}

function isRegistrationAllowed() {
  if (process.env.ALLOW_ADMIN_REGISTRATION === 'false') return false
  return true
}

router.post('/register', requireAdminAuth, async (req, res) => {
  try {
    if (!isRegistrationAllowed()) {
      return res.status(403).json({ success: false, error: 'Création d\'administrateur désactivée' })
    }

    const { fullName, phone, password, confirmPassword } = req.body

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

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Les mots de passe ne correspondent pas' })
    }

    const existing = await Admin.findOne({ phone: normalizedPhone })
    if (existing) {
      return res.status(409).json({ success: false, error: 'Ce numéro est déjà utilisé' })
    }

    const admin = await Admin.create({
      fullName: fullName.trim(),
      phone: normalizedPhone,
      password,
    })

    res.status(201).json({
      success: true,
      data: {
        admin: admin.toPublicJSON(),
      },
    })
  } catch (error) {
    console.error('Erreur création admin:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

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
    const token = createAdminToken(admin._id)

    res.json({
      success: true,
      data: {
        admin: admin.toPublicJSON(),
        token,
      },
    })
  } catch (error) {
    console.error('Erreur connexion admin:', error)
    const dbDown =
      error?.name === 'MongooseServerSelectionError' ||
      error?.name === 'MongoServerSelectionError' ||
      mongoose.connection.readyState !== 1
    if (dbDown) {
      return res.status(503).json({
        success: false,
        error:
          'Base de données inaccessible. Vérifiez que votre IP est autorisée dans MongoDB Atlas (Network Access).',
      })
    }
    res.status(500).json({ success: false, error: 'Connexion impossible' })
  }
})

router.get('/me', requireAdminAuth, (req, res) => {
  res.json({ success: true, data: { admin: req.admin.toPublicJSON() } })
})

export default router
