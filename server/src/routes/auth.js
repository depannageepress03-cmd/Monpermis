import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getGoogleAudiences, verifyGoogleIdToken } from '../utils/googleAuth.js'
import { User } from '../models/User.js'
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/email.js'
import { normalizeBeninPhone } from '../services/fedapay.js'
import { generateVerificationToken, getVerificationExpiry } from '../utils/tokens.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { AccountDeleteBlockedError, deleteUserAccount } from '../utils/deleteUserAccount.js'
import { logger } from '../utils/logger.js'
import { logUserActivity } from '../utils/activityLog.js'

const router = Router()

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' })
}

/** Normalise un téléphone Bénin (10 chiffres) ; chaîne vide si invalide / vide. */
function normalizeLearnerPhone(phone) {
  if (phone == null || String(phone).trim() === '') return ''
  return normalizeBeninPhone(phone) || ''
}

async function assertPhoneAvailable(normalizedPhone, excludeUserId = null) {
  if (!normalizedPhone) return
  const filter = { phone: normalizedPhone }
  if (excludeUserId) filter._id = { $ne: excludeUserId }
  const existing = await User.findOne(filter).select('_id')
  if (existing) {
    const error = new Error('Ce numéro de téléphone est déjà utilisé')
    error.status = 409
    throw error
  }
}

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body
    const rawEmail = String(req.body?.email || '').trim()

    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Prénom, nom, téléphone et mot de passe sont requis',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Code : minimum 8 caractères' })
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Code : doit contenir majuscule, minuscule et chiffre',
      })
    }

    if (firstName.length > 100 || lastName.length > 100 || phone.length > 30) {
      return res.status(400).json({ success: false, error: 'Un ou plusieurs champs sont trop longs' })
    }

    if (rawEmail && rawEmail.length > 254) {
      return res.status(400).json({ success: false, error: 'Email trop long' })
    }

    const normalizedPhone = normalizeLearnerPhone(phone)
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone invalide. Exemple : 0147880143',
      })
    }

    try {
      await assertPhoneAvailable(normalizedPhone)
    } catch (phoneError) {
      return res.status(phoneError.status || 409).json({
        success: false,
        error: phoneError.message,
      })
    }

    const normalizedEmail = rawEmail ? rawEmail.toLowerCase() : ''
    if (normalizedEmail) {
      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) {
        if (existing.googleId) {
          return res.status(409).json({
            success: false,
            error: 'Cet email est déjà associé à un compte. Utilise ton téléphone pour te connecter, ou contacte le support.',
          })
        }
        return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' })
      }
    }

    const hasEmail = Boolean(normalizedEmail)
    const verificationToken = hasEmail ? generateVerificationToken() : undefined
    const userPayload = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: normalizedPhone,
      password,
      authProvider: 'local',
      isEmailVerified: !hasEmail,
    }
    if (hasEmail) {
      userPayload.email = normalizedEmail
      userPayload.emailVerificationToken = verificationToken
      userPayload.emailVerificationExpires = getVerificationExpiry()
    }

    const user = await User.create(userPayload)

    if (hasEmail && verificationToken) {
      sendVerificationEmail(user, verificationToken).catch((err) => {
        console.error('Email de vérification non envoyé:', err.message)
      })
    }

    logUserActivity(req, {
      user,
      action: 'register',
      resource: 'user',
      resourceId: String(user._id),
      summary: `Inscription · ${user.firstName} ${user.lastName}`,
      severity: 'success',
      metadata: { phone: user.phone, hasEmail },
    })

    res.status(201).json({
      success: true,
      data: {
        message: hasEmail
          ? 'Compte créé. Vérifiez votre email pour activer votre compte, puis connectez-vous.'
          : 'Compte créé. Connectez-vous avec votre téléphone et votre mot de passe.',
        email: user.email || '',
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error('Erreur inscription:', error)
    if (error?.code === 11000) {
      const field = error?.keyPattern?.phone
        ? 'Ce numéro de téléphone est déjà utilisé'
        : error?.keyPattern?.email
          ? 'Cet email est déjà utilisé'
          : 'Ce compte existe déjà'
      return res.status(409).json({ success: false, error: field })
    }
    res.status(500).json({ success: false, error: 'Erreur lors de la création du compte' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const password = req.body?.password
    const identifier = String(
      req.body?.identifier || req.body?.phone || req.body?.email || '',
    ).trim()

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
error: 'Téléphone et mot de passe requis',
      })
    }

    if (identifier.includes('@')) {
      return res.status(400).json({
        success: false,
error: 'Connecte-toi avec ton numéro de téléphone',
      })
    }

    const normalizedPhone = normalizeLearnerPhone(identifier)

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone invalide. Exemple : 0147880143',
      })
    }

    const user = await User.findOne({ phone: normalizedPhone }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
error: 'Téléphone ou mot de passe incorrect',
      })
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
error:
          'Ce compte n’a pas encore de mot de passe. Contacte le support Monpermis pour en définir un.',
        code: 'NO_PASSWORD',
      })
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
error: 'Téléphone ou mot de passe incorrect',
      })
    }

    const clientHeader = String(req.get('X-Client') || '').toLowerCase()
    const clientBody = String(req.body?.client || '').toLowerCase()
    const isMobileClient = clientHeader === 'mobile' || clientBody === 'mobile'

    // Comptes téléphone sans email : déjà vérifiés.
    // Seuls les locaux avec email non vérifié sont bloqués (web, legacy).
    const hasEmail = Boolean(String(user.email || '').trim())
    if (
      !isMobileClient &&
      user.authProvider !== 'google' &&
      hasEmail &&
      !user.isEmailVerified
    ) {
      return res.status(403).json({
        success: false,
        error: 'Vérifiez votre email avant de vous connecter. Consultez votre boîte de réception.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
    }

    const token = createToken(user._id)

    logUserActivity(req, {
      user,
      action: 'login',
      resource: 'user',
      resourceId: String(user._id),
      summary: `Connexion · ${user.firstName} ${user.lastName}`,
      severity: 'info',
      metadata: { client: isMobileClient ? 'mobile' : 'web' },
    })

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

router.post('/resend-verification', async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' })
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires +password',
    )

    // Réponse neutre pour ne pas révéler si l’email existe.
    const okMessage = {
      success: true,
      data: { message: 'Si un compte non vérifié existe pour cet email, un nouveau lien a été envoyé.' },
    }

    if (!user || user.isEmailVerified || user.authProvider === 'google' || !user.password) {
      return res.json(okMessage)
    }

    const verificationToken = generateVerificationToken()
    user.emailVerificationToken = verificationToken
    user.emailVerificationExpires = getVerificationExpiry()
    await user.save()

    sendVerificationEmail(user, verificationToken).catch((err) => {
      logger.error('Email de vérification (renvoi) non envoyé', { error: err.message })
    })

    res.json(okMessage)
  } catch (error) {
    logger.error('Erreur resend-verification', { error: error.message })
    res.status(500).json({ success: false, error: 'Envoi impossible' })
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
      const normalizedPhone = normalizeLearnerPhone(phone)
      if (String(phone).trim() && !normalizedPhone) {
        return res.status(400).json({
          success: false,
          error: 'Numéro de téléphone invalide. Exemple : 0147880143',
        })
      }
      if (normalizedPhone) {
        try {
          await assertPhoneAvailable(normalizedPhone, user._id)
        } catch (phoneError) {
          return res.status(phoneError.status || 409).json({
            success: false,
            error: phoneError.message,
          })
        }
      }
      user.phone = normalizedPhone
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

    if (!password) {
      return res.status(400).json({ success: false, error: 'Code requis' })
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Code incorrect' })
    }

    await deleteUserAccount(user._id, { cancelledBy: 'learner' })

    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    if (error instanceof AccountDeleteBlockedError || error?.code === 'PAYMENT_IN_PROGRESS') {
      return res.status(409).json({ success: false, error: error.message })
    }
    logger.error('Erreur suppression compte', { error: error.message })
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Config publique pour les clients (boutons Google web / mobile). */
router.get('/google/config', (_req, res) => {
  const audiences = getGoogleAudiences()
  res.json({
    success: true,
    data: {
      enabled: audiences.length > 0,
      clientId:
        String(process.env.GOOGLE_CLIENT_ID || '').trim() || audiences[0] || '',
      androidClientId: String(process.env.GOOGLE_ANDROID_CLIENT_ID || '').trim(),
      iosClientId: String(process.env.GOOGLE_IOS_CLIENT_ID || '').trim(),
    },
  })
})

router.post('/google', async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || '').trim()
    const clientHeader = String(req.get('X-Client') || '').toLowerCase()
    const clientBody = String(req.body?.client || '').toLowerCase()
    const clientKind = clientHeader === 'mobile' || clientBody === 'mobile' ? 'mobile' : 'web'

    if (getGoogleAudiences().length === 0) {
      return res.status(503).json({
        success: false,
        error: 'La connexion Google n’est pas configurée. Contacte le support.',
        code: 'GOOGLE_NOT_CONFIGURED',
      })
    }

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Jeton Google manquant',
        code: 'GOOGLE_TOKEN_MISSING',
      })
    }

    let payload
    try {
      payload = await verifyGoogleIdToken(idToken)
    } catch (error) {
      logger.warn('Vérification ID token Google refusée', { error: error.message })
      return res.status(401).json({
        success: false,
        error: 'Session Google invalide ou expirée. Réessaie.',
        code: 'GOOGLE_TOKEN_INVALID',
      })
    }

    const email = String(payload?.email || '').trim().toLowerCase()
    const googleId = String(payload?.sub || '').trim()

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de lire ton compte Google.',
        code: 'GOOGLE_PAYLOAD_MISSING',
      })
    }

    if (payload.email_verified !== true && String(payload.email_verified) !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'Ton adresse Gmail n’est pas vérifiée. Vérifie-la sur Google puis réessaie.',
        code: 'GOOGLE_EMAIL_UNVERIFIED',
      })
    }

    const googleName = String(payload?.name || '').trim()
    const googleFirstName = String(
      payload?.given_name || (googleName ? googleName.split(' ')[0] : ''),
    )
      .trim()
      .slice(0, 100)
    const googleLastName = String(
      payload?.family_name || (googleName ? googleName.split(' ').slice(1).join(' ') : ''),
    )
      .trim()
      .slice(0, 100)

    let user = await User.findOne({ googleId })

    if (!user) {
      // Compte local existant (même email) → liaison Google, mot de passe conservé.
      user = await User.findOne({ email }).select('+password')
      if (user) {
        user.googleId = googleId
        user.authProvider = 'google'
        user.isEmailVerified = true
        if (!user.firstName && googleFirstName) user.firstName = googleFirstName
        if (!user.lastName && googleLastName) user.lastName = googleLastName
        await user.save()
      }
    }

    if (!user) {
      user = await User.create({
        firstName: googleFirstName || 'Utilisateur',
        lastName: googleLastName || 'Google',
        email,
        googleId,
        authProvider: 'google',
        isEmailVerified: true,
        phone: '',
      })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu. Contacte l’administration.',
      })
    }

    const token = createToken(user._id)

    logUserActivity(req, {
      user,
      action: 'google_login',
      resource: 'user',
      resourceId: String(user._id),
      summary: `Connexion Google · ${user.firstName} ${user.lastName}`,
      severity: 'info',
      metadata: { client: clientKind, email },
    })

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        token,
        needsPhone: !String(user.phone || '').trim(),
      },
    })
  } catch (error) {
    console.error('Erreur connexion Google:', error)
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà associé à un autre compte. Utilise ton téléphone pour te connecter, ou contacte le support.',
      })
    }
    res.status(500).json({ success: false, error: 'Erreur lors de la connexion Google' })
  }
})

export default router
