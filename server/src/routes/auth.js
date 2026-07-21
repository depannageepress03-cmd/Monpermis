import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { Notification } from '../models/Notification.js'
import { UserSubscription } from '../models/UserSubscription.js'
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/email.js'
import { generateVerificationToken, getVerificationExpiry } from '../utils/tokens.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { logger } from '../utils/logger.js'
import { verifyGoogleIdToken } from '../utils/googleAuth.js'

const router = Router()

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' })
}

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont requis' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Mot de passe : minimum 8 caract\u00e8res' })
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe : doit contenir majuscule, minuscule et chiffre',
      })
    }

    if (firstName.length > 100 || lastName.length > 100 || email.length > 254 || phone.length > 30) {
      return res.status(400).json({ success: false, error: 'Un ou plusieurs champs sont trop longs' })
    }

    const normalizedEmail = email.toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })

    if (existing) {
      if (existing.googleId) {
        return res.status(409).json({
          success: false,
          error: 'Cet email est lié à Google. Connectez-vous avec Google.',
          code: 'USE_GOOGLE',
        })
      }
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' })
    }

    const verificationToken = generateVerificationToken()
    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      authProvider: 'local',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: getVerificationExpiry(),
    })

    sendVerificationEmail(user, verificationToken).catch((err) => {
      console.error('Email de vérification non envoyé:', err.message)
    })

    const token = createToken(user._id)

    res.status(201).json({
      success: true,
      data: {
        message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
        user: user.toPublicJSON(),
        token,
      },
    })
  } catch (error) {
    console.error('Erreur inscription:', error)
    res.status(500).json({ success: false, error: 'Erreur lors de la création du compte' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu. Contactez l’administration.',
      })
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Ce compte utilise Google. Connectez-vous avec Google.',
        code: 'USE_GOOGLE',
      })
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' })
    }

    const token = createToken(user._id)

    res.json({
      success: true,
      data: { user: user.toPublicJSON(), token },
    })
  } catch (error) {
    console.error('Erreur connexion:', error)
    res.status(500).json({ success: false, error: 'Erreur lors de la connexion' })
  }
})

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requis' })
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires')

    if (!user) {
      return res.status(400).json({ success: false, error: 'Token invalide ou expir\u00e9' })
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined
    await user.save()

    sendWelcomeEmail(user).catch((err) => {
      console.error('Email de bienvenue non envoy\u00e9:', err.message)
    })

    res.json({ success: true, data: { message: 'Email v\u00e9rifi\u00e9 avec succ\u00e8s' } })
  } catch (error) {
    console.error('Erreur v\u00e9rification email:', error)
    res.status(500).json({ success: false, error: 'V\u00e9rification impossible' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.json({ success: true, data: { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' } })
    }

    const token = generateVerificationToken()
    user.passwordResetToken = token
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(user, token).catch((err) => {
      logger.error('Email réinitialisation non envoyé', { error: err.message })
    })

    res.json({ success: true, data: { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' } })
  } catch (error) {
    logger.error('Erreur forgot-password', { error: error.message })
    res.status(500).json({ success: false, error: 'Erreur lors de la demande' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token et mot de passe requis' })
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

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires +password')

    if (!user) {
      return res.status(400).json({ success: false, error: 'Token invalide ou expiré' })
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.json({ success: true, data: { message: 'Mot de passe réinitialisé avec succès' } })
  } catch (error) {
    logger.error('Erreur reset-password', { error: error.message })
    res.status(500).json({ success: false, error: 'Réinitialisation impossible' })
  }
})

router.post('/change-password', requireUserAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Mot de passe actuel et nouveau requis' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Nouveau mot de passe : minimum 8 caractères' })
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe : doit contenir majuscule, minuscule et chiffre',
      })
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.json({ success: true, data: { message: 'Mot de passe modifié avec succès' } })
  } catch (error) {
    logger.error('Erreur change-password', { error: error.message })
    res.status(500).json({ success: false, error: 'Modification impossible' })
  }
})

router.patch('/profile', requireUserAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body
    const user = req.user

    if (firstName !== undefined) {
      if (firstName.trim().length < 1 || firstName.length > 100) {
        return res.status(400).json({ success: false, error: 'Prénom invalide' })
      }
      user.firstName = firstName.trim()
    }

    if (lastName !== undefined) {
      if (lastName.trim().length < 1 || lastName.length > 100) {
        return res.status(400).json({ success: false, error: 'Nom invalide' })
      }
      user.lastName = lastName.trim()
    }

    if (phone !== undefined) {
      if (phone.length > 30) {
        return res.status(400).json({ success: false, error: 'Téléphone trop long' })
      }
      user.phone = phone.trim()
    }

    await user.save()
    res.json({ success: true, data: { user: user.toPublicJSON() } })
  } catch (error) {
    logger.error('Erreur update profile', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/account', requireUserAuth, async (req, res) => {
  try {
    const { password, confirm } = req.body || {}
    if (confirm !== true && confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation requise pour supprimer le compte',
      })
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!user) {
      return res.status(404).json({ success: false, error: 'Compte introuvable' })
    }

    if (user.authProvider !== 'google') {
      if (!password) {
        return res.status(400).json({ success: false, error: 'Mot de passe requis' })
      }
      if (!(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
      }
    }

    const userId = user._id
    await Promise.all([
      Notification.deleteMany({ userId }),
      UserSubscription.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ])

    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    logger.error('Erreur suppression compte', { error: error.message })
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Token Google requis' })
    }

    const payload = await verifyGoogleIdToken(idToken)
    if (!payload?.email || !payload.sub) {
      return res.status(400).json({ success: false, error: 'Token Google invalide' })
    }

    if (!payload.email_verified) {
      return res.status(400).json({ success: false, error: 'Email Google non vérifié' })
    }

    const normalizedEmail = payload.email.toLowerCase()
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
    })

    if (!user) {
      user = await User.create({
        firstName: payload.given_name || 'Utilisateur',
        lastName: payload.family_name || '',
        email: normalizedEmail,
        googleId: payload.sub,
        authProvider: 'google',
        isEmailVerified: true,
      })
      await sendWelcomeEmail(user).catch((err) => {
        console.error('Email de bienvenue non envoyé:', err.message)
      })
    } else if (!user.googleId) {
      user.googleId = payload.sub
      user.isEmailVerified = true
      await user.save()
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu. Contactez l’administration.',
      })
    }

    const token = createToken(user._id)

    res.json({
      success: true,
      data: { user: user.toPublicJSON(), token },
    })
  } catch (error) {
    console.error('Erreur connexion Google:', error)
    res.status(401).json({ success: false, error: 'Connexion Google échouée' })
  }
})

export default router
