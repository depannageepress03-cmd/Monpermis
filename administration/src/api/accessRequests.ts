import { apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'

export type AccessModuleKey = 'code' | 'conduite_heures' | 'conduite_videos' | 'ecodepermis' | 'aiChat'
export type AccessModuleUnit = 'flat' | 'month' | 'hour' | 'week'
export type AccessRequestStatus =
  | 'en_attente'
  | 'paiement_declare'
  | 'en_verification'
  | 'valide'
  | 'actif'
  | 'expire'
  | 'rejete'
export type PaymentMethod = 'fedapay' | 'manual'
export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

export interface AccessModulePricing {
  key: AccessModuleKey
  label: string
  unit: AccessModuleUnit
  price: number
  currency: string
  active: boolean
  hoursDiscount?: number
  amountForOne?: number
  amountForTwoHours?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface LearnerRef {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface AccessRequest {
  id: string
  userId: string
  module: AccessModuleKey
  status: AccessRequestStatus
  quantity: number
  amount: number
  currency: string
  unit: AccessModuleUnit
  startAt: string | null
  endAt: string | null
  lastDecisionNote: string
  hoursCredited: boolean
  learner: LearnerRef | null
  createdAt: string
  updatedAt: string
}

export interface AccessAuditEntry {
  id: string
  fromStatus: string
  toStatus: string
  actor: string
  actorLabel: string
  note: string
  createdAt: string
}

export interface AccessPayment {
  id: string
  accessRequestId: string
  accessRequestIds?: string[]
  userId: string
  method: PaymentMethod
  amount: number
  currency: string
  status: PaymentStatus
  paymentUrl: string
  /** Opérateur Mobile Money (mtn / moov / celtiis) pour les paiements sendNow. */
  paymentMethod: string
  fedapayReference: string
  declaredReference: string
  declaredAt: string | null
  errorMessage: string
  activatedAt: string | null
  learner: LearnerRef | null
  verifiedByAdmin: { id: string; fullName: string } | null
  verifiedAt: string | null
  adminNote: string
  createdAt: string
  updatedAt: string
}

export interface AccessStats {
  revenueByModule: { module: AccessModuleKey; total: number; count: number }[]
  countByStatus: { status: AccessRequestStatus; count: number }[]
  revenueByMethod: { method: PaymentMethod; total: number; count: number }[]
  pendingOver24h: number
}

export function paymentChannelLabel(payment: Pick<AccessPayment, 'method' | 'paymentMethod'>) {
  if (payment.method === 'manual') return 'Hors ligne'
  const operator = String(payment.paymentMethod || '').toLowerCase()
  if (operator === 'mtn') return 'MTN Mobile Money'
  if (operator === 'moov') return 'Moov Money'
  if (operator === 'celtiis') return 'Celtiis Money'
  return 'Mobile Money (FedaPay)'
}

export function unitLabel(unit: AccessModuleUnit) {
  if (unit === 'hour') return 'par heure'
  if (unit === 'week') return 'par semaine (legacy)'
  if (unit === 'month') return 'par mois'
  return 'unique'
}

export function fetchAccessRequests(
  token: string,
  filters: { status?: AccessRequestStatus | ''; module?: AccessModuleKey | ''; page?: number } = {},
) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.module) params.set('module', filters.module)
  if (filters.page) params.set('page', String(filters.page))
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{
    accessRequests: AccessRequest[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/access-requests${query}`, {}, token)
}

export function fetchAccessRequestDetail(token: string, id: string) {
  return apiFetch<{ accessRequest: AccessRequest; audit: AccessAuditEntry[]; payments: AccessPayment[] }>(
    `/api/admin/access-requests/${id}`,
    {},
    token,
  )
}

export function validateAccessRequest(
  token: string,
  id: string,
  payload: { decision: 'valide' | 'rejete'; note: string },
) {
  return apiFetch<{ accessRequest: AccessRequest }>(
    `/api/admin/access-requests/${id}/validate`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function fetchAccessModulePricing(token: string) {
  return apiFetch<{ modules: AccessModulePricing[] }>('/api/admin/access-requests/modules', {}, token)
}

export function updateAccessModulePricing(
  token: string,
  key: AccessModuleKey,
  payload: Partial<Pick<AccessModulePricing, 'price' | 'active' | 'label' | 'unit'>>,
) {
  return apiFetch<{ module: AccessModulePricing }>(
    `/api/admin/access-requests/modules/${key}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function fetchAccessStats(token: string) {
  return apiFetch<AccessStats>('/api/admin/access-requests/stats', {}, token)
}

/**
 * Flux SSE partagé avec le dashboard Paiements (server/src/services/paymentEvents.js) :
 * on filtre ici les événements 'access_request.updated'. Même approche fetch-stream
 * que subscribeToPaymentEvents (EventSource ne permet pas d'en-tête Authorization).
 */
export function subscribeToAccessRequestEvents(
  token: string,
  onUpdate: (accessRequest: AccessRequest) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  const controller = new AbortController()

  void (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${getApiOrigin()}/api/admin/access-requests/payments/stream`, {
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
                accessRequest?: AccessRequest
              }
              if (parsed.type === 'access_request.updated' && parsed.accessRequest) {
                onUpdate(parsed.accessRequest)
              }
            } catch {
              // ignore trame invalide
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
