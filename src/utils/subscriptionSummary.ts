import type { AccessMe, AccessModuleKey, AccessRequest } from '../api/accessRequests'

const MODULE_LABELS: Record<AccessModuleKey, string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  ecodepermis: 'E-Codepermis',
  aiChat: 'Chat IA',
}

export interface ActiveSubscription {
  module: AccessModuleKey
  label: string
  endAt: string
  daysLeft: number
  remainingLabel: string
}

function remainingLabel(endAt: string, now = Date.now()): string {
  const remainingMs = Math.max(0, new Date(endAt).getTime() - now)
  if (remainingMs <= 0) return 'Expiré'
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days >= 1) {
    return hours > 0 ? `${days} j ${hours} h` : `${days} jour${days > 1 ? 's' : ''}`
  }
  if (hours >= 1) return `${hours} h`
  const minutes = Math.max(1, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)))
  return `${minutes} min`
}

function isLiveSubscription(request: AccessRequest, now = Date.now()): boolean {
  if (request.status !== 'actif') return false
  if (!request.endAt) return false
  return new Date(request.endAt).getTime() > now
}

/** Abonnements temporels encore actifs (endAt dans le futur). */
export function getActiveSubscriptions(me: AccessMe | null): ActiveSubscription[] {
  if (!me) return []
  const now = Date.now()
  const seen = new Set<AccessModuleKey>()
  const result: ActiveSubscription[] = []

  for (const request of me.requests) {
    if (!isLiveSubscription(request, now) || seen.has(request.module)) continue
    seen.add(request.module)
    const endAt = request.endAt!
    const daysLeft = Math.max(0, Math.ceil((new Date(endAt).getTime() - now) / (24 * 60 * 60 * 1000)))
    result.push({
      module: request.module,
      label: MODULE_LABELS[request.module] || request.module,
      endAt,
      daysLeft,
      remainingLabel: remainingLabel(endAt, now),
    })
  }

  return result.sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
}

export function formatSubscriptionEndDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
