// QA — fixtures : 1 admin, 3 apprenants (sans abo / code actif / heures),
// 2 moniteurs + créneaux 7 jours, 2 chapitres + QCM, 1 examen blanc,
// catalogue 4 formules (Grâce 14j, Code, Conduite, Pack).
import bcrypt from 'bcryptjs'
import { models } from './db.mjs'

export const QA_PASSWORD = 'QaTest1234'

function futureDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function dateLabel(offsetDays) {
  const d = futureDate(offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function seedAdmin() {
  const { Admin } = models
  await Admin.deleteMany({ phone: '0199000001' })
  const admin = new Admin({
    fullName: 'QA Admin',
    phone: '0199000001',
    password: QA_PASSWORD,
    role: 'superadmin',
    isActive: true,
  })
  await admin.save()
  return admin
}

export async function seedLearner({ email, phone, verified = true, soldeHeures = 0 }) {
  const { User } = models
  await User.deleteOne({ email })
  const user = await User.create({
    firstName: 'Qa',
    lastName: 'Learner',
    email,
    phone,
    password: QA_PASSWORD,
    authProvider: 'local',
    isEmailVerified: verified,
    isActive: true,
    soldeHeures,
    heuresEffectuees: 0,
    heuresObjectif: 20,
  })
  return user
}

export async function grantCodeAccess(userId, days = 30) {
  const { AccessRequest } = models
  return AccessRequest.create({
    userId,
    module: 'code',
    status: 'actif',
    quantity: 1,
    amount: 5000,
    currency: 'XOF',
    unit: 'flat',
    startAt: new Date(),
    endAt: futureDate(days),
  })
}

export async function grantConduiteHours(userId, hours = 2) {
  const { AccessRequest } = models
  const { User } = models
  await AccessRequest.create({
    userId,
    module: 'conduite_heures',
    status: 'valide',
    quantity: hours,
    amount: hours * 5000,
    currency: 'XOF',
    unit: 'hour',
    hoursCredited: true,
  })
  await User.updateOne({ _id: userId }, { $inc: { soldeHeures: hours } })
}

export async function seedMoniteur({ firstName = 'Qa', lastName = 'Moniteur', phone = '0199000011' }) {
  const { Moniteur } = models
  await Moniteur.deleteOne({ phone })
  const moniteur = new Moniteur({
    firstName,
    lastName,
    phone,
    email: `${phone}@test.local`,
    active: true,
    defaultPriceFcfa: 5000,
    vehicleBrand: 'Toyota Corolla QA',
    city: 'Cotonou',
  })
  await moniteur.setPassword(QA_PASSWORD)
  await moniteur.save()
  return moniteur
}

export async function seedCreneaux(moniteurId, days = 7) {
  const { Creneau } = models
  const docs = []
  for (let d = 1; d <= days; d += 1) {
    docs.push({
      moniteurId,
      date: dateLabel(d),
      startTime: '08:00',
      endTime: '09:00',
      vehicleType: 'voiture',
      status: 'libre',
      priceFcfa: 5000,
    })
  }
  await Creneau.deleteMany({ moniteurId })
  return Creneau.insertMany(docs)
}

export async function seedCodeContent() {
  const { Chapter, Question, PracticeExam } = models
  await Question.deleteMany({})
  await Chapter.deleteMany({ name: /^QA / })
  await PracticeExam.deleteMany({ examNumber: 10 })
  const chapters = await Chapter.insertMany([
    { name: 'QA Chapitre 1', order: 1, published: true, courses: [] },
    { name: 'QA Chapitre 2', order: 2, published: true, courses: [] },
  ])
  const questions = []
  for (const chapter of chapters) {
    const count = chapter.order === 1 ? 20 : 3
    for (let i = 1; i <= count; i += 1) {
      questions.push({
        chapterId: chapter._id,
        order: i,
        published: true,
        prompt: { text: `QA question ${i} chap ${chapter.order}` },
        answers: [
          { label: 'A', text: 'Bonne réponse', isCorrect: true },
          { label: 'B', text: 'Mauvaise réponse', isCorrect: false },
        ],
      })
    }
  }
  const created = await Question.insertMany(questions)
  const exam = await PracticeExam.create({
    examNumber: 10,
    questionIds: created.filter((q) => String(q.chapterId) === String(chapters[0]._id)).map((q) => q._id),
    published: true,
  })
  return { chapters, questions: created, exam }
}

export async function seedPricing() {
  // Le serveur initialise déjà le catalogue au démarrage ; on s'assure
  // simplement que les 4 formules existent (idempotent).
  const { AccessModulePricing } = await import('../../src/models/AccessModulePricing.js')
  for (const [key, label, price, unit] of [
    ['grace', 'Grâce 14 jours', 0, 'flat'],
    ['code', 'Code', 5000, 'flat'],
    ['conduite_heures', 'Conduite', 5000, 'hour'],
    ['pack', 'Pack', 30000, 'flat'],
  ]) {
    await AccessModulePricing.updateOne(
      { key },
      { $setOnInsert: { key, label, price, currency: 'XOF', unit, active: true } },
      { upsert: true },
    )
  }
}

export { bcrypt }
