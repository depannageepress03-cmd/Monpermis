import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { sendWelcomeEmail } from '../services/email.js'

const router = Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont requis' })
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

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      authProvider: 'local',
      isEmailVerified: true,
    })

    sendWelcomeEmail(user).catch((err) => {
      console.error('Email de bienvenue non envoyé:', err.message)
    })

    const token = createToken(user._id)

    res.status(201).json({
      success: true,
      data: {
        message: 'Compte créé avec succès.',
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

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Token Google requis' })
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, error: 'Connexion Google non configurée' })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
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
