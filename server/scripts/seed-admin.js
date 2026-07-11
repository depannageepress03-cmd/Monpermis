import 'dotenv/config'
import mongoose from 'mongoose'
import { Admin } from '../src/models/Admin.js'

const phone = process.env.ADMIN_PHONE
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_FULL_NAME || 'Administrateur'

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
    console.log(`Admin déjà existant : ${existing.phone}`)
    process.exit(0)
  }

  const admin = await Admin.create({
    fullName,
    phone: normalizedPhone,
    password,
  })

  console.log(`Administrateur créé : ${admin.fullName} (${admin.phone})`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
