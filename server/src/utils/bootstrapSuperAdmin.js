import { Admin } from '../models/Admin.js'
import { invalidateSuperAdminCache } from '../middleware/adminAuth.js'
import { logger } from './logger.js'

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) local = digits.slice(3)
  return local.slice(0, 10)
}

/**
 * Assure un premier superadmin :
 * 1. SUPERADMIN_PHONE → promu / activé
 * 2. sinon, s’il n’existe aucun superadmin et un seul admin → le promeut
 * 3. sinon, log d’avertissement
 */
export async function ensureSuperAdminBootstrap() {
  const envPhone = normalizePhone(process.env.SUPERADMIN_PHONE)
  if (envPhone && /^\d{10}$/.test(envPhone)) {
    const admin = await Admin.findOne({ phone: envPhone })
    if (!admin) {
      logger.warn('SUPERADMIN_PHONE défini mais aucun admin trouvé', { phone: envPhone })
      return { action: 'missing', phone: envPhone }
    }
    const before = { role: admin.role, isActive: admin.isActive }
    let changed = false
    if (admin.role !== 'superadmin') {
      admin.role = 'superadmin'
      changed = true
    }
    if (!admin.isActive) {
      admin.isActive = true
      changed = true
    }
    if (changed) {
      await admin.save()
      invalidateSuperAdminCache()
      logger.info('Superadmin promu via SUPERADMIN_PHONE', {
        phone: admin.phone,
        before,
        after: { role: admin.role, isActive: admin.isActive },
      })
      return { action: 'promoted', phone: admin.phone }
    }
    return { action: 'already', phone: admin.phone }
  }

  const superCount = await Admin.countDocuments({ role: 'superadmin' })
  if (superCount > 0) return { action: 'ok' }

  const admins = await Admin.find().sort({ createdAt: 1 }).limit(2)
  if (admins.length === 1) {
    const only = admins[0]
    only.role = 'superadmin'
    only.isActive = true
    await only.save()
    invalidateSuperAdminCache()
    logger.info('Unique admin promu superadmin (bootstrap)', {
      phone: only.phone,
      fullName: only.fullName,
    })
    return { action: 'elevated_first', phone: only.phone }
  }

  if (admins.length === 0) {
    logger.warn(
      'Aucun administrateur. Créez-en un avec npm run seed:admin (rôle superadmin) ou définissez SUPERADMIN_PHONE après création.',
    )
    return { action: 'none' }
  }

  logger.warn(
    'Plusieurs admins sans superadmin. Définissez SUPERADMIN_PHONE pour en promouvoir un, ou changez le rôle via un compte déjà superadmin.',
  )
  return { action: 'needs_env' }
}

/** Empêche de retirer le dernier superadmin actif. */
export async function assertNotLastActiveSuperAdmin(adminDoc, { nextRole, nextActive } = {}) {
  if (adminDoc.role !== 'superadmin') return

  const willRemainSuper =
    (nextRole === undefined ? true : nextRole === 'superadmin') &&
    (nextActive === undefined ? adminDoc.isActive : Boolean(nextActive))

  if (willRemainSuper) return

  const others = await Admin.countDocuments({
    _id: { $ne: adminDoc._id },
    role: 'superadmin',
    isActive: true,
  })
  if (others === 0) {
    const err = new Error('Impossible : il doit rester au moins un super-administrateur actif')
    err.status = 400
    throw err
  }
}
