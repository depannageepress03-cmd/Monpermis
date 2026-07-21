import nodemailer from 'nodemailer'

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const from = process.env.SMTP_FROM || 'Monpermis.bj <noreply@monpermis.bj>'

async function sendMail({ to, subject, html, text }) {
  const mail = { from, to, subject, html, text }
  const transporter = getTransporter()

  if (!transporter) {
    console.log('\n--- Email (mode dev, SMTP non configuré) ---')
    console.log(`À: ${to}`)
    console.log(`Sujet: ${subject}`)
    console.log(text)
    console.log('---\n')
    return { dev: true }
  }

  const info = await transporter.sendMail(mail)
  console.log(`✉️ Email envoyé à ${to} — id: ${info.messageId}`)
  return info
}

function escapeHtml(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getClientBaseUrl() {
  return String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')
}

function getVerifyUrl(token) {
  return `${getClientBaseUrl()}/verifier-email?token=${token}`
}

function getMobileVerifyUrl(token) {
  const scheme = process.env.MOBILE_SCHEME
  if (!scheme) return null
  return `${scheme}://verifier-email?token=${token}`
}

function getResetUrl(token) {
  return `${getClientBaseUrl()}/reinitialiser-mot-de-passe?token=${token}`
}

function getMobileResetUrl(token) {
  const scheme = process.env.MOBILE_SCHEME
  if (!scheme) return null
  return `${scheme}://reinitialiser-mot-de-passe?token=${token}`
}

export async function sendVerificationEmail(user, token) {
  const verifyUrl = getVerifyUrl(token)
  const mobileUrl = getMobileVerifyUrl(token)
  const safeName = escapeHtml(user.firstName)
  const mobileHint = mobileUrl
    ? `\n\nDepuis l'application mobile, vous pouvez aussi ouvrir :\n${mobileUrl}`
    : ''

  const subject = 'Vérifiez votre adresse email — Monpermis.bj'
  const text = `Bonjour ${user.firstName},

Bienvenue sur Monpermis.bj ! Cliquez sur le lien ci-dessous pour vérifier votre adresse email :

${verifyUrl}${mobileHint}

Ce lien expire dans 24 heures.

Si vous n'avez pas créé de compte, ignorez cet email.

L'équipe Monpermis.bj`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0f4c4c">Bienvenue sur Monpermis.bj</h2>
      <p>Bonjour <strong>${safeName}</strong>,</p>
      <p>Merci de vous être inscrit. Veuillez confirmer votre adresse email pour activer votre compte :</p>
      <p style="margin:28px 0">
        <a href="${verifyUrl}" style="background:#0f4c4c;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Vérifier mon email
        </a>
      </p>
      ${
        mobileUrl
          ? `<p style="color:#6b7280;font-size:14px">Sur mobile : <a href="${mobileUrl}">ouvrir dans l'app</a></p>`
          : ''
      }
      <p style="color:#6b7280;font-size:14px">Ce lien expire dans 24 heures.</p>
      <p style="color:#9ca3af;font-size:12px">Si le bouton ne fonctionne pas, copiez ce lien :<br>${verifyUrl}</p>
    </div>
  `

  return sendMail({ to: user.email, subject, html, text })
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = getResetUrl(token)
  const mobileUrl = getMobileResetUrl(token)
  const safeName = escapeHtml(user.firstName)
  const mobileHint = mobileUrl
    ? `\n\nDepuis l'application mobile, vous pouvez aussi ouvrir :\n${mobileUrl}`
    : ''

  const subject = 'Réinitialisation de mot de passe — Monpermis.bj'
  const text = `Bonjour ${user.firstName},

Vous avez demandé la réinitialisation de votre mot de passe Monpermis.bj.

Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :
${resetUrl}${mobileHint}

Ce lien expire dans 1 heure.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

L'équipe Monpermis.bj`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0f4c4c">Réinitialisation de mot de passe</h2>
      <p>Bonjour <strong>${safeName}</strong>,</p>
      <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}" style="background:#0f4c4c;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Réinitialiser mon mot de passe
        </a>
      </p>
      ${
        mobileUrl
          ? `<p style="color:#6b7280;font-size:14px">Sur mobile : <a href="${mobileUrl}">ouvrir dans l'app</a></p>`
          : ''
      }
      <p style="color:#6b7280;font-size:14px">Ce lien expire dans 1 heure.</p>
      <p style="color:#9ca3af;font-size:12px">Si le bouton ne fonctionne pas, copiez ce lien :<br>${resetUrl}</p>
    </div>
  `

  return sendMail({ to: user.email, subject, html, text })
}

export async function sendSubscriptionExpiryEmail(user, subscription) {
  const safeName = escapeHtml(user.firstName)
  const expiryDate = subscription.endAt
    ? new Date(subscription.endAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'bientôt'
  const renewUrl = `${process.env.CLIENT_URL}/abonnement`

  const subject = 'Votre abonnement Monpermis.bj expire bientôt'
  const text = `Bonjour ${user.firstName},

Votre abonnement Monpermis.bj arrive à expiration le ${expiryDate}.

Pour continuer à accéder à vos cours et réservations, renouvelez votre abonnement dès maintenant :
${renewUrl}

L'équipe Monpermis.bj`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0f4c4c">Votre abonnement expire bientôt</h2>
      <p>Bonjour <strong>${safeName}</strong>,</p>
      <p>Votre abonnement arrivera à expiration le <strong>${expiryDate}</strong>.</p>
      <p>Pour ne pas perdre l'accès à vos cours et réservations, renouvelez dès maintenant :</p>
      <p style="margin:28px 0">
        <a href="${renewUrl}" style="background:#0f4c4c;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Renouveler mon abonnement
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">Merci de votre confiance.</p>
    </div>
  `

  return sendMail({ to: user.email, subject, html, text })
}

export async function sendWelcomeEmail(user) {
  const loginUrl = `${process.env.CLIENT_URL}/`
  const safeName = escapeHtml(user.firstName)

  const subject = 'Bienvenue sur Monpermis.bj !'
  const text = `Bonjour ${user.firstName},

Votre email a été vérifié avec succès. Votre compte Monpermis.bj est maintenant actif.

Vous pouvez vous connecter et commencer votre formation au code de la route :
${loginUrl}

Bonne préparation pour votre permis !

L'équipe Monpermis.bj`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0f4c4c">Compte activé !</h2>
      <p>Bonjour <strong>${safeName}</strong>,</p>
      <p>Votre email est confirmé. Bienvenue sur <strong>Monpermis.bj</strong> !</p>
      <p>Vous pouvez maintenant accéder à vos cours, QCM et examens blancs.</p>
      <p style="margin:28px 0">
        <a href="${loginUrl}" style="background:#0f4c4c;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Se connecter
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">Bonne préparation pour votre permis !</p>
    </div>
  `

  return sendMail({ to: user.email, subject, html, text })
}
