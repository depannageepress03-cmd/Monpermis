import { Announcement } from '../models/Announcement.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { User } from '../models/User.js'
import { notifyManyUsers } from './notifications.js'
import { logger } from '../utils/logger.js'
import { sanitizeAnnouncementHtml, stripHtml, looksLikeHtml } from '../utils/sanitizeHtml.js'

export const ANNOUNCEMENT_KINDS = ['info', 'promo', 'alerte']
export const ANNOUNCEMENT_AUDIENCES = ['all', 'active', 'code', 'conduite']

export const TITLE_MAX = 160
export const BODY_PLAIN_MAX = 4000

/**
 * Audience :
 * - all      → tous les comptes actifs
 * - active   → abonnement/accès en cours (ou solde heures)
 * - code     → accès code / e-codepermis
 * - conduite → accès vidéos conduite ou solde heures
 */
export function normalizeAudience(value) {
  return ANNOUNCEMENT_AUDIENCES.includes(value) ? value : 'all'
}

export function prepareAnnouncementBody(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (looksLikeHtml(text)) {
    return sanitizeAnnouncementHtml(text)
  }
  return text
}

export function plainBodyPreview(body, max = 280) {
  const plain = stripHtml(body)
  if (plain.length <= max) return plain
  return `${plain.slice(0, max - 1)}…`
}

function sanitizeCtaUrl(raw) {
  const href = String(raw ?? '').trim()
  if (!href) return ''
  if (/^https?:\/\//i.test(href)) return href
  if (href.startsWith('/') && !href.startsWith('//')) return href
  return ''
}

function parseOptionalDate(value) {
  if (value === null || value === undefined || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { error: 'Date invalide' }
  return { date: d }
}

/**
 * Parse / merge des champs annonce (création + édition).
 * `existing` = document mongoose ou plain object pour merge partiel.
 */
export function parseAnnouncementInput(body, existing = {}) {
  const titleSource = body?.title !== undefined ? body.title : existing.title
  const title = String(titleSource ?? '').trim()
  if (!title) return { error: 'Le titre est requis' }
  if (title.length > TITLE_MAX) return { error: `Titre trop long (${TITLE_MAX} max)` }

  const bodySource = body?.body !== undefined ? body.body : existing.body
  const preparedBody = prepareAnnouncementBody(bodySource)
  const plainLen = stripHtml(preparedBody).length
  if (plainLen > BODY_PLAIN_MAX) {
    return { error: `Message trop long (${BODY_PLAIN_MAX} caractères max)` }
  }

  const kindSource = body?.kind !== undefined ? body.kind : existing.kind
  const kind = ANNOUNCEMENT_KINDS.includes(kindSource) ? kindSource : 'info'

  const audienceSource = body?.audience !== undefined ? body.audience : existing.audience
  const audience = normalizeAudience(audienceSource)

  const active =
    body?.active === undefined
      ? existing.active === undefined
        ? false
        : Boolean(existing.active)
      : Boolean(body.active)

  const scheduledParsed = parseOptionalDate(
    body?.scheduledAt !== undefined ? body.scheduledAt : existing.scheduledAt,
  )
  if (scheduledParsed?.error) return { error: 'Date de programmation invalide' }
  const scheduledAt = scheduledParsed?.date ?? null

  const expiresParsed = parseOptionalDate(
    body?.expiresAt !== undefined ? body.expiresAt : existing.expiresAt,
  )
  if (expiresParsed?.error) return { error: 'Date d’expiration invalide' }
  const expiresAt = expiresParsed?.date ?? null

  if (scheduledAt && expiresAt && expiresAt <= scheduledAt) {
    return { error: 'L’expiration doit être postérieure à la programmation' }
  }

  const ctaUrl = sanitizeCtaUrl(
    body?.ctaUrl !== undefined ? body.ctaUrl : existing.ctaUrl,
  )
  const imageUrl =
    body?.imageUrl !== undefined
      ? String(body.imageUrl ?? '').trim()
      : String(existing.imageUrl ?? '').trim()
  const imagePublicId =
    body?.imagePublicId !== undefined
      ? String(body.imagePublicId ?? '').trim()
      : String(existing.imagePublicId ?? '').trim()

  // Programmation future → brouillon jusqu’au tick
  let resolvedActive = active
  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    resolvedActive = false
  }
  // Déjà expirée → inactive
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    resolvedActive = false
  }

  return {
    data: {
      title,
      body: preparedBody,
      kind,
      audience,
      active: resolvedActive,
      scheduledAt,
      expiresAt,
      ctaUrl,
      imageUrl,
      imagePublicId: imageUrl ? imagePublicId : '',
    },
  }
}

async function userIdsWithActiveAccess({ modules } = {}) {
  const now = new Date()
  const moduleFilter = modules?.length ? { module: { $in: modules } } : {}
  const fromRequests = await AccessRequest.find({
    status: 'actif',
    ...moduleFilter,
    // Aligné sur la coupure d’accès : now >= endAt ⇒ plus actif.
    $or: [{ endAt: null }, { endAt: { $gt: now } }],
  }).distinct('userId')

  if (modules?.includes('conduite_heures') || modules?.includes('conduite_videos')) {
    const withHours = await User.find({ isActive: true, soldeHeures: { $gt: 0 } }).distinct('_id')
    const set = new Set([...fromRequests.map(String), ...withHours.map(String)])
    return [...set]
  }

  return fromRequests.map(String)
}

/** IDs destinataires (comptes actifs uniquement). */
export async function resolveRecipientIds(audience = 'all') {
  const target = normalizeAudience(audience)

  if (target === 'all') {
    return User.find({ isActive: true }).distinct('_id')
  }

  if (target === 'active') {
    const ids = await userIdsWithActiveAccess()
    const withHours = await User.find({ isActive: true, soldeHeures: { $gt: 0 } }).distinct('_id')
    const set = new Set([...ids.map(String), ...withHours.map(String)])
    // Filtrer isActive
    const activeUsers = await User.find({
      _id: { $in: [...set] },
      isActive: true,
    }).distinct('_id')
    return activeUsers
  }

  if (target === 'code') {
    const ids = await userIdsWithActiveAccess({ modules: ['code', 'ecodepermis'] })
    return User.find({ _id: { $in: ids }, isActive: true }).distinct('_id')
  }

  if (target === 'conduite') {
    const ids = await userIdsWithActiveAccess({
      modules: ['conduite_videos', 'conduite_heures'],
    })
    return User.find({ _id: { $in: ids }, isActive: true }).distinct('_id')
  }

  return User.find({ isActive: true }).distinct('_id')
}

export async function countRecipients(audience = 'all') {
  const ids = await resolveRecipientIds(audience)
  return ids.length
}

/** L’utilisateur courant voit-il cette annonce (audience) ? */
export async function userMatchesAudience(user, audience = 'all') {
  const target = normalizeAudience(audience)
  if (target === 'all') return true
  if (!user?._id) return false

  if (target === 'active') {
    if ((user.soldeHeures || 0) > 0) return true
    const hit = await AccessRequest.exists({
      userId: user._id,
      status: 'actif',
      $or: [{ endAt: null }, { endAt: { $gt: new Date() } }],
    })
    return Boolean(hit)
  }

  if (target === 'code') {
    const hit = await AccessRequest.exists({
      userId: user._id,
      status: 'actif',
      module: { $in: ['code', 'ecodepermis'] },
      $or: [{ endAt: null }, { endAt: { $gt: new Date() } }],
    })
    return Boolean(hit)
  }

  if (target === 'conduite') {
    if ((user.soldeHeures || 0) > 0) return true
    const hit = await AccessRequest.exists({
      userId: user._id,
      status: 'actif',
      module: { $in: ['conduite_videos', 'conduite_heures'] },
      $or: [{ endAt: null }, { endAt: { $gt: new Date() } }],
    })
    return Boolean(hit)
  }

  return true
}

/**
 * Diffuse en notification in-app. Retourne le nombre créé.
 * `link` pointe vers le fil d’actualités (détail si id connu).
 */
export async function broadcastAnnouncement(announcement, { renotify = false } = {}) {
  if (!announcement?.active && !renotify) return 0

  const userIds = await resolveRecipientIds(announcement.audience || 'all')
  const plain = plainBodyPreview(announcement.body, 240)
  const link = announcement._id
    ? `actualites/${String(announcement._id)}`
    : 'actualites'

  const broadcastCount = await notifyManyUsers(userIds, {
    type: 'announcement',
    title: announcement.title,
    body: plain,
    link,
  })

  announcement.broadcastAt = new Date()
  await announcement.save()
  return broadcastCount
}

/** Active les annonces programmées dont l’heure est passée. */
export async function activateScheduledAnnouncements() {
  const now = new Date()
  const due = await Announcement.find({
    active: false,
    scheduledAt: { $ne: null, $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })

  let activated = 0
  let notified = 0
  for (const announcement of due) {
    announcement.active = true
    await announcement.save()
    activated += 1
    // Notifier seulement si jamais diffusé
    if (!announcement.broadcastAt) {
      try {
        notified += await broadcastAnnouncement(announcement)
      } catch (error) {
        logger.error('Diffusion annonce programmée échouée', {
          error: error.message,
          id: String(announcement._id),
        })
      }
    }
  }
  return { activated, notified }
}

/** Dépublie les annonces expirées. */
export async function deactivateExpiredAnnouncements() {
  const now = new Date()
  const result = await Announcement.updateMany(
    {
      active: true,
      expiresAt: { $ne: null, $lte: now },
    },
    { $set: { active: false } },
  )
  return { deactivated: result.modifiedCount || 0 }
}

export async function runAnnouncementJobs() {
  const scheduled = await activateScheduledAnnouncements()
  const expired = await deactivateExpiredAnnouncements()
  return { ...scheduled, ...expired }
}

/** Filtre Mongo pour le fil public (annonces actives non expirées). */
export function publicAnnouncementFilter(now = new Date()) {
  return {
    active: true,
    $and: [
      { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  }
}
