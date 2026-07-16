import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db
  const admins = db.collection('admins')
  
  const hashed = await bcrypt.hash('Admin1234', 12)
  const result = await admins.updateOne(
    { phone: '0147880143' },
    { $set: { password: hashed, failedLoginAttempts: 0, lockUntil: null } }
  )

  if (result.matchedCount === 0) {
    console.log('Admin non trouvé, création...')
    await admins.insertOne({
      fullName: 'Super Admin',
      phone: '0147880143',
      password: hashed,
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  console.log('Mot de passe réinitialisé pour 0147880143 / Admin1234')
  process.exit(0)
}

reset().catch(e => { console.error(e); process.exit(1) })
