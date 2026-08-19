/**
 * Crée deux moniteurs de démonstration visibles dans l’admin.
 * Usage : node scripts/seed-example-moniteurs.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Moniteur } from '../src/models/Moniteur.js'

const PASSWORD = 'Exemple2026!'

const EXAMPLES = [
  {
    firstName: 'Kodjo',
    lastName: 'Exemple',
    email: 'kodjo.exemple@monpermis.bj',
    phone: '',
    city: '',
    bio: '',
    photoUrl: '',
    vehicleBrand: '',
    weeklyAvailability: [],
    active: false,
    activeLogin: true,
  },
  {
    firstName: 'Amina',
    lastName: 'Exemple',
    email: 'amina.exemple@monpermis.bj',
    phone: '0190000042',
    city: 'Cotonou',
    bio: 'Monitrice d’exemple à Cotonou. Pédagogie calme, parking et conduite en ville. Dossier de démonstration pour l’administration.',
    photoUrl:
      'https://ui-avatars.com/api/?name=Amina+Exemple&size=256&background=001030&color=ffffff&bold=true',
    vehicleBrand: 'Toyota Corolla',
    vehiclePhotoUrl:
      'https://ui-avatars.com/api/?name=Toyota+Corolla&size=256&background=00B050&color=ffffff',
    specialties: ['conduite ville', 'parking'],
    vehicleTypes: ['voiture'],
    defaultPriceFcfa: 5000,
    weeklyAvailability: [
      { dayOfWeek: 1, start: '08:00', end: '12:00' },
      { dayOfWeek: 1, start: '14:00', end: '18:00' },
      { dayOfWeek: 2, start: '08:00', end: '12:00' },
      { dayOfWeek: 3, start: '08:00', end: '12:00' },
      { dayOfWeek: 4, start: '14:00', end: '18:00' },
      { dayOfWeek: 5, start: '08:00', end: '12:00' },
      { dayOfWeek: 6, start: '08:00', end: '13:00' },
    ],
    active: false,
    activeLogin: true,
  },
]

async function upsertExample(def) {
  let moniteur = await Moniteur.findOne({ email: def.email }).select('+passwordHash')
  if (!moniteur) {
    moniteur = new Moniteur({ email: def.email })
  }
  moniteur.set({
    firstName: def.firstName,
    lastName: def.lastName,
    phone: def.phone || '',
    city: def.city || '',
    bio: def.bio || '',
    photoUrl: def.photoUrl || '',
    vehicleBrand: def.vehicleBrand || '',
    vehiclePhotoUrl: def.vehiclePhotoUrl || '',
    specialties: def.specialties || [],
    vehicleTypes: def.vehicleTypes || ['voiture'],
    defaultPriceFcfa: def.defaultPriceFcfa || 5000,
    weeklyAvailability: def.weeklyAvailability || [],
    active: Boolean(def.active),
    activeLogin: def.activeLogin !== false,
  })
  await moniteur.setPassword(PASSWORD)
  await moniteur.save()
  const json = moniteur.toJSONSafe()
  return {
    name: json.fullName,
    email: json.email,
    ready: json.profileStatus?.complete,
    percent: json.profileStatus?.readyPercent,
    published: json.active,
  }
}

await mongoose.connect(process.env.MONGODB_URI)
const results = []
for (const item of EXAMPLES) {
  results.push(await upsertExample(item))
}
await mongoose.disconnect()
console.log(JSON.stringify({ password: PASSWORD, moniteurs: results }, null, 2))
