import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Moniteur } from '../models/Moniteur.js'
import { requireMoniteurAuth } from '../middleware/moniteurAuth.js'
import { moniteurLoginLimiter } from '../middleware/rateLimiters.js'
import { logger } from '../utils/logger.js'
import { DUMMY_BCRYPT_HASH } from '../middleware/security.js'
import bcrypt from 'bcryptjs'

const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function createMoniteurToken(moniteur) {
  return jwt.sign(
    {
      moniteurId: String(moniteur._id),
      scope: 'moniteur',
      sv: moniteur.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '12h',
      algorithm: 'HS256',
      issuer: 'monpermis',
      audience: 'moniteur',
    },
  )
}

router.post('/login', moniteurLoginLimiter, async (req, res) => {
  try {
    if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' })
    }
    const email = normalizeEmail(req.body.email)
    const password = req.body.password

    if (!EMAIL_PATTERN.test(email) || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' })
    }

    const moniteur = await Moniteur.findOne({ email }).select('+passwordHash')
    if (!moniteur || !moniteur.passwordHash) {
      // Même durée de réponse qu'un vrai compte : pas d'énumération par le temps.
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH)
      logger.warn('Connexion moniteur refusée (compte inconnu)', { ip: req.ip })
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    const ok = await moniteur.comparePassword(password)
    if (!ok) {
      if (!moniteur.isLocked()) await moniteur.registerFailedLogin()
      logger.warn('Connexion moniteur refusée (mot de passe)', { ip: req.ip, moniteurId: String(moniteur._id) })
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    if (moniteur.isLocked()) {
      logger.warn('Connexion moniteur refusée (compte verrouillé)', { ip: req.ip, moniteurId: String(moniteur._id) })
      return res.status(429).json({
        success: false,
        error: 'Compte temporairement verrouillé. Réessayez dans quelques minutes.',
      })
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

    moniteur.resetFailedLogins()
    moniteur.lastLoginAt = new Date()
    await moniteur.save()

    res.json({
      success: true,
      data: {
        moniteur: moniteur.toAuthJSON(),
        token: createMoniteurToken(moniteur),
        homePath: '/',
      },
    })
  } catch (error) {
    logger.error('Erreur login moniteur:', error)
    res.status(500).json({ success: false, error: 'Connexion impossible' })
  }
})

router.post('/logout', requireMoniteurAuth, async (req, res) => {
  try {
    await Moniteur.updateOne({ _id: req.moniteur._id }, { $inc: { sessionVersion: 1 } })
    res.json({ success: true, data: { ok: true } })
  } catch (error) {
    logger.error('Erreur déconnexion moniteur:', error)
    res.status(500).json({ success: false, error: 'Déconnexion impossible' })
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
