import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../src/models/User.js'

const email = process.argv[2]

if (!email) {
  console.error('Usage: npm run verify:user -- email@example.com')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI)

const user = await User.findOne({ email: email.toLowerCase() })

if (!user) {
  console.error(`Aucun compte trouvé pour ${email}`)
  process.exit(1)
}

if (user.isEmailVerified) {
  console.log(`✓ ${email} est déjà vérifié`)
} else {
  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save()
  console.log(`✓ ${email} a été vérifié manuellement`)
}

await mongoose.disconnect()
