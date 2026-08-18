import 'dotenv/config'
import mongoose from 'mongoose'
import { Admin } from '../src/models/Admin.js'

const phone = process.env.ADMIN_PHONE
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_FULL_NAME || 'Administrateur'
/** Par défaut superadmin pour le premier compte seed. */
const roleEnv = String(process.env.ADMIN_ROLE || 'superadmin').toLowerCase()
const role = roleEnv === 'admin' ? 'admin' : 'superadmin'

function normalizePhone(value) {
  const digits = String(value).replace(/\D/g, '')
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) local = digits.slice(3)
  return local.slice(0, 10)
}

if (!phone || !password) {
  console.error('Définissez ADMIN_PHONE et ADMIN_PASSWORD dans server/.env')
  process.exit(1)
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD doit contenir au moins 8 caractères')
  process.exit(1)
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)

  const normalizedPhone = normalizePhone(phone)
  const existing = await Admin.findOne({ phone: normalizedPhone })
  if (existing) {
    let updated = false
    if (existing.role !== role && process.env.ADMIN_FORCE_ROLE === 'true') {
      existing.role = role
      updated = true
    }
    if (existing.fullName !== fullName) {
      existing.fullName = fullName
      updated = true
    }
    if (existing.password !== password) {
      existing.password = password
      updated = true
    }
    if (updated) {
      existing.isActive = true
      await existing.save()
    }
    console.log(
      `Admin déjà existant : ${existing.fullName} (${existing.phone}) — rôle: ${existing.role})${updated ? ' — mis à jour' : ''}`,
    )
    if (existing.role !== 'superadmin') {
      console.log(
        'Astuce : définissez SUPERADMIN_PHONE=' +
          existing.phone +
          ' puis redémarrez le serveur, ou ADMIN_FORCE_ROLE=true avec ADMIN_ROLE=superadmin.',
      )
    }
    process.exit(0)
  }

  const admin = await Admin.create({
    fullName,
    phone: normalizedPhone,
    password,
    role,
  })

  console.log(`Administrateur créé : ${admin.fullName} (${admin.phone}) — rôle: ${admin.role}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
