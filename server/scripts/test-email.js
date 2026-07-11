import 'dotenv/config'
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('❌ Variables SMTP manquantes dans server/.env')
  console.error('   Requis : SMTP_HOST, SMTP_USER, SMTP_PASS')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: SMTP_SECURE === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
})

const testTo = process.argv[2] || SMTP_USER

console.log(`Test d'envoi vers : ${testTo}`)

try {
  await transporter.verify()
  console.log('✅ Connexion SMTP OK')

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `Monpermis.bj <${SMTP_USER}>`,
    to: testTo,
    subject: 'Test Monpermis.bj — configuration email',
    text: 'Bravo ! Votre configuration email Monpermis.bj fonctionne correctement.',
    html: '<p>Bravo ! Votre configuration email <strong>Monpermis.bj</strong> fonctionne correctement.</p>',
  })

  console.log('✅ Email envoyé :', info.messageId)
} catch (error) {
  console.error('❌ Erreur :', error.message)
  process.exit(1)
}
