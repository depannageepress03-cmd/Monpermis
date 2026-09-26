// QA — accès direct à la base mémoire pour seed et assertions.
// (Code de test uniquement ; le métier n'est pas modifié.)
import mongoose from 'mongoose'
import { User } from '../../src/models/User.js'
import { Admin } from '../../src/models/Admin.js'
import { Moniteur } from '../../src/models/Moniteur.js'
import { Creneau } from '../../src/models/Creneau.js'
import { Reservation } from '../../src/models/Reservation.js'
import { AccessRequest } from '../../src/models/AccessRequest.js'
import { Payment } from '../../src/models/Payment.js'
import { Chapter } from '../../src/models/Chapter.js'
import { Question } from '../../src/models/Question.js'
import { PracticeExam } from '../../src/models/PracticeExam.js'
import { Notification } from '../../src/models/Notification.js'

export const models = {
  User,
  Admin,
  Moniteur,
  Creneau,
  Reservation,
  AccessRequest,
  Payment,
  Chapter,
  Question,
  PracticeExam,
  Notification,
}

export async function connectTestDb(uri) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri)
  }
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect()
  }
}
