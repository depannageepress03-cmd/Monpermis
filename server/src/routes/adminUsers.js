import { Router } from 'express'
import { User } from '../models/User.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { buildLearnerJourney } from '../utils/learnerJourney.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizePhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) {
    local = digits.slice(3)
  }
  return local.slice(0, 10)
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit
    const search = String(req.query.q || '').trim()

    const filter = {}
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        users: users.map((user) => user.toAdminJSON()),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    logger.error('Erreur liste utilisateurs', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { users: [] } })
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const users = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
    })
      .limit(20)
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: { users: users.map((user) => user.toAdminJSON()) },
    })
  } catch (error) {
    logger.error('Erreur recherche utilisateurs', { error: error.message })
    res.status(500).json({ success: false, error: 'Recherche impossible' })
  }
})

router.get('/:userId/progress', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'Apprenant introuvable' })
    }

    const journey = await buildLearnerJourney(user)
    res.json({
      success: true,
      data: {
        user: user.toAdminJSON(),
        ...journey,
      },
    })
  } catch (error) {
    logger.error('Erreur progression apprenant', { error: error.message })
    res.status(500).json({ success: false, error: 'Progression indisponible' })
  }
})

router.post('/', audit('create', 'user'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body ?? {}

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'Prénom, nom, email et mot de passe requis',
      })
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nom trop court' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Email invalide' })
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe : minimum 8 caractères',
      })
    }

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' })
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizePhone(phone),
      password,
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
    })

    res.status(201).json({
      success: true,
      data: { user: user.toAdminJSON() },
    })
  } catch (error) {
    logger.error('Erreur création utilisateur', { error: error.message })
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/:userId', audit('update', 'user'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
    }

    const { firstName, lastName, phone, isActive, password } = req.body ?? {}

    if (firstName !== undefined) {
      if (!String(firstName).trim() || String(firstName).trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Prénom invalide' })
      }
      user.firstName = String(firstName).trim()
    }

    if (lastName !== undefined) {
      if (!String(lastName).trim() || String(lastName).trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Nom invalide' })
      }
      user.lastName = String(lastName).trim()
    }

    if (phone !== undefined) {
      user.phone = normalizePhone(phone)
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive)
    }

    if (password !== undefined && password !== '') {
      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe : minimum 8 caractères',
        })
      }
      user.password = password
      user.authProvider = user.authProvider || 'local'
    }

    await user.save()

    res.json({
      success: true,
      data: { user: user.toAdminJSON() },
    })
  } catch (error) {
    logger.error('Erreur mise à jour utilisateur', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/:userId', audit('delete', 'user'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
    }

    res.json({
      success: true,
      data: { deleted: true, id: String(user._id) },
    })
  } catch (error) {
    logger.error('Erreur suppression utilisateur', { error: error.message })
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

export default router
