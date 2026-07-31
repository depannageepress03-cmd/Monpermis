import { apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'

export type ActivityActorType = 'admin' | 'user' | 'system'
export type ActivitySeverity = 'info' | 'success' | 'warning' | 'danger'

export interface ActivityEvent {
  id: string
  actorType: ActivityActorType
  actorId: string | null
  actorName: string
  action: string
  resource: string
  resourceId: string | null
  summary: string
  severity: ActivitySeverity
  metadata: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface CockpitAdminBrief {
  id: string
  fullName: string
  phone: string
  role: string
  isActive: boolean
  lastLoginAt?: string | null
}

export interface CockpitData {
  admins: {
    total: number
    active: number
    superadmins: number
    activeLast24h: number
    recent: CockpitAdminBrief[]
  }
  activity: {
    today: number
    recent: ActivityEvent[]
  }
  users: {
    registeredToday: number
  }
  finances: {
    currency: string
    todayEncaisse: number
    monthEncaisse: number
    needsRefund: number
  }
}

export interface ActivityQuery {
  page?: number
  limit?: number
  actorType?: ActivityActorType | ''
  action?: string
  resource?: string
  actorId?: string
  from?: string
  to?: string
  q?: string
}

function toQuery(params: ActivityQuery) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.actorType) search.set('actorType', params.actorType)
  if (params.action) search.set('action', params.action)
  if (params.resource) search.set('resource', params.resource)
  if (params.actorId) search.set('actorId', params.actorId)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.q) search.set('q', params.q)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchCockpit(token: string) {
  return apiFetch<CockpitData>('/api/admin/activity/cockpit', {}, token)
}

export function fetchActivity(token: string, query: ActivityQuery = {}) {
  return apiFetch<{
    events: ActivityEvent[]
    pagination: { page: number; limit: number; total: number; pages: number }
    filters: { actions: string[]; resources: string[] }
  }>(`/api/admin/activity${toQuery(query)}`, {}, token)
}

/**
 * SSE activité unifiée (Authorization via fetch — EventSource ne le permet pas).
 */
export function subscribeToActivityEvents(
  token: string,
  onEvent: (activity: ActivityEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  const controller = new AbortController()

  void (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${getApiOrigin()}/api/admin/activity/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error('Flux indisponible')

        onStatusChange?.(true)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''
          for (const chunk of events) {
            const line = chunk.split('\n').find((l) => l.startsWith('data: '))
            if (!line) continue
            try {
              const parsed = JSON.parse(line.slice(6)) as {
                type: string
                activity?: ActivityEvent
              }
              if (parsed.type === 'activity' && parsed.activity) {
                onEvent(parsed.activity)
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return
      }
      onStatusChange?.(false)
      if (controller.signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  })()

  return () => controller.abort()
}
