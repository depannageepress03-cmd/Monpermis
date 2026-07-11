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

function getVerifyUrl(token) {
  if (process.env.MOBILE_SCHEME) {
    return `${process.env.MOBILE_SCHEME}://verifier-email?token=${token}`
  }
  return `${process.env.CLIENT_URL}/verifier-email?token=${token}`
}

export async function sendVerificationEmail(user, token) {
  const verifyUrl = getVerifyUrl(token)

  const subject = 'Vérifiez votre adresse email — Monpermis.bj'
  const text = `Bonjour ${user.firstName},

Bienvenue sur Monpermis.bj ! Cliquez sur le lien ci-dessous pour vérifier votre adresse email :

${verifyUrl}

Ce lien expire dans 24 heures.

Si vous n'avez pas créé de compte, ignorez cet email.

L'équipe Monpermis.bj`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0f4c4c">Bienvenue sur Monpermis.bj</h2>
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
      <p>Merci de vous être inscrit. Veuillez confirmer votre adresse email pour activer votre compte :</p>
      <p style="margin:28px 0">
        <a href="${verifyUrl}" style="background:#0f4c4c;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Vérifier mon email
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">Ce lien expire dans 24 heures.</p>
      <p style="color:#9ca3af;font-size:12px">Si le bouton ne fonctionne pas, copiez ce lien :<br>${verifyUrl}</p>
    </div>
  `

  return sendMail({ to: user.email, subject, html, text })
}

export async function sendWelcomeEmail(user) {
  const loginUrl = `${process.env.CLIENT_URL}/`

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
      <p>Bonjour <strong>${user.firstName}</strong>,</p>
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
