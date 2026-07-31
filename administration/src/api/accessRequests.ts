import { apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'

export type AccessModuleKey = 'code' | 'conduite_heures' | 'conduite_videos' | 'aiChat'
export type AccessModuleUnit = 'flat' | 'day' | 'month' | 'hour' | 'week'
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
export type SubscriptionSource = 'payment' | 'admin'

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

export interface Subscriber extends AccessRequest {
  durationLabel: string
  remainingMs: number | null
  remainingLabel: string
  source: SubscriptionSource
  soldeHeures: number | null
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
  reservationGroupId?: string | null
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
  needsRefund?: boolean
  learner: LearnerRef | null
  verifiedByAdmin: { id: string; fullName: string } | null
  verifiedAt: string | null
  adminNote: string
  createdAt: string
  updatedAt: string
  module?: AccessModuleKey | null
  modules?: AccessModuleKey[]
  kind?: 'abonnement' | 'reservation' | 'autre'
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
  if (unit === 'day') return 'par jour'
  if (unit === 'week') return 'par semaine (legacy)'
  if (unit === 'month') return 'par mois'
  return 'unique'
}

export function fetchSubscribers(
  token: string,
  filters: { module?: AccessModuleKey | ''; q?: string; page?: number } = {},
) {
  const params = new URLSearchParams()
  if (filters.module) params.set('module', filters.module)
  if (filters.q) params.set('q', filters.q)
  if (filters.page) params.set('page', String(filters.page))
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{
    subscribers: Subscriber[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/access-requests/subscribers${query}`, {}, token)
}

export function grantSubscription(
  token: string,
  payload: { userId: string; module: AccessModuleKey; quantity: number; note?: string },
) {
  return apiFetch<{ subscriber: Subscriber }>(
    '/api/admin/access-requests/grant',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function fetchApprovedPayments(
  token: string,
  filters: { page?: number; needsRefund?: boolean } = {},
) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.needsRefund) params.set('needsRefund', '1')
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{
    payments: AccessPayment[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/access-requests/payments${query}`, {}, token)
}

export function resolvePaymentRefund(token: string, paymentId: string, note: string) {
  return apiFetch<{ payment: AccessPayment }>(
    `/api/admin/access-requests/payments/${paymentId}/resolve-refund`,
    { method: 'PATCH', body: JSON.stringify({ note }) },
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
 * Flux SSE partagé avec le dashboard (server/src/services/paymentEvents.js).
 */
export function subscribeToPaymentStream(
  token: string,
  handlers: {
    onPayment?: (payment: AccessPayment) => void
    onSubscriber?: (accessRequest: AccessRequest) => void
    onStatusChange?: (connected: boolean) => void
  },
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

        handlers.onStatusChange?.(true)
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
                payment?: AccessPayment
              }
              if (parsed.type === 'access_request.updated' && parsed.accessRequest) {
                handlers.onSubscriber?.(parsed.accessRequest)
              }
              if (parsed.type === 'payment.updated' && parsed.payment) {
                handlers.onPayment?.(parsed.payment)
              }
            } catch {
              // ignore trame invalide
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return
      }
      handlers.onStatusChange?.(false)
      if (controller.signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  })()

  return () => controller.abort()
}
