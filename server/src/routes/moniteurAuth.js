import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Moniteur } from '../models/Moniteur.js'
import { requireMoniteurAuth } from '../middleware/moniteurAuth.js'
import { logger } from '../utils/logger.js'

const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function createMoniteurToken(moniteurId) {
  return jwt.sign(
    {
      moniteurId: String(moniteurId),
      scope: 'moniteur',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '12h',
      algorithm: 'HS256',
    },
  )
}

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const password = String(req.body.password || '')

    if (!EMAIL_PATTERN.test(email) || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' })
    }

    const moniteur = await Moniteur.findOne({ email }).select('+passwordHash')
    if (!moniteur || !moniteur.passwordHash) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    if (!moniteur.active) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé, contactez l’administration',
        code: 'ACCOUNT_DISABLED',
      })
    }

    if (!moniteur.activeLogin) {
      return res.status(403).json({
        success: false,
        error: 'Compte non activé, contactez l’administration',
        code: 'LOGIN_DISABLED',
      })
    }

    const ok = await moniteur.comparePassword(password)
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    moniteur.lastLoginAt = new Date()
    await moniteur.save()

    res.json({
      success: true,
      data: {
        moniteur: moniteur.toAuthJSON(),
        token: createMoniteurToken(moniteur._id),
        homePath: '/',
      },
    })
  } catch (error) {
    logger.error('Erreur login moniteur:', error)
    res.status(500).json({ success: false, error: 'Connexion impossible' })
  }
})

router.get('/me', requireMoniteurAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { moniteur: req.moniteur.toAuthJSON() } })
  } catch (error) {
    logger.error('Erreur me moniteur:', error)
    res.status(500).json({ success: false, error: 'Session impossible à charger' })
  }
})

export default router
