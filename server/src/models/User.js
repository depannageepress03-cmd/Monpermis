import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export const MIN_COURSE_SECONDS = 5 * 60

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    password: { type: String, minlength: 8, select: false },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    isEmailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    /** Solde d'heures de conduite restantes (achetées / créditées). */
    soldeHeures: { type: Number, default: 0, min: 0 },
    /** Heures de conduite déjà effectuées. */
    heuresEffectuees: { type: Number, default: 0, min: 0 },
    /** Objectif d'heures (ex. 20). */
    heuresObjectif: { type: Number, default: 20, min: 1 },
    completedCourses: [
      {
        chapterId: { type: String, required: true },
        courseId: { type: String, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    courseSessions: [
      {
        chapterId: { type: String, required: true },
        courseId: { type: String, required: true },
        openedAt: { type: Date, default: Date.now },
      },
    ],
    completedTests: [
      {
        chapterId: { type: String, required: true },
        correct: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        completedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false)
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.hasCompletedCourse = function hasCompletedCourse(chapterId, courseId) {
  return (this.completedCourses || []).some(
    (entry) => entry.chapterId === String(chapterId) && entry.courseId === String(courseId),
  )
}

userSchema.methods.hasCompletedTest = function hasCompletedTest(chapterId) {
  return (this.completedTests || []).some((entry) => entry.chapterId === String(chapterId))
}

userSchema.methods.getCourseSession = function getCourseSession(chapterId, courseId) {
  return (this.courseSessions || []).find(
    (entry) => entry.chapterId === String(chapterId) && entry.courseId === String(courseId),
  )
}

userSchema.methods.startCourseSession = async function startCourseSession(chapterId, courseId) {
  if (this.hasCompletedCourse(chapterId, courseId)) {
    return this.getCourseSession(chapterId, courseId)
  }

  if (!this.courseSessions) this.courseSessions = []

  const existing = this.getCourseSession(chapterId, courseId)
  if (existing) return existing

  this.courseSessions.push({
    chapterId: String(chapterId),
    courseId: String(courseId),
    openedAt: new Date(),
  })
  await this.save()
  return this.getCourseSession(chapterId, courseId)
}

userSchema.methods.getCourseUnlockSeconds = function getCourseUnlockSeconds(chapterId, courseId) {
  if (this.hasCompletedCourse(chapterId, courseId)) return 0
  const session = this.getCourseSession(chapterId, courseId)
  if (!session?.openedAt) return MIN_COURSE_SECONDS
  const elapsed = Math.floor((Date.now() - new Date(session.openedAt).getTime()) / 1000)
  return Math.max(0, MIN_COURSE_SECONDS - elapsed)
}

userSchema.methods.markCourseCompleted = async function markCourseCompleted(chapterId, courseId) {
  if (this.hasCompletedCourse(chapterId, courseId)) return this
  this.completedCourses.push({
    chapterId: String(chapterId),
    courseId: String(courseId),
    completedAt: new Date(),
  })
  await this.save()
  return this
}

userSchema.methods.markTestCompleted = async function markTestCompleted(chapterId, correct, total) {
  if (this.hasCompletedTest(chapterId)) return this
  if (!this.completedTests) this.completedTests = []
  this.completedTests.push({
    chapterId: String(chapterId),
    correct: Number(correct) || 0,
    total: Number(total) || 0,
    completedAt: new Date(),
  })
  await this.save()
  return this
}

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    authProvider: this.authProvider,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive !== false,
    soldeHeures: this.soldeHeures || 0,
    heuresEffectuees: this.heuresEffectuees || 0,
    heuresObjectif: this.heuresObjectif || 20,
    createdAt: this.createdAt,
  }
}

userSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    updatedAt: this.updatedAt,
  }
}

export const User = mongoose.model('User', userSchema)
