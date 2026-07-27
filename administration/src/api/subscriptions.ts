import { apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'

export type DurationType = 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'
export type CustomDurationUnit = 'days' | 'weeks' | 'months' | 'years'
export type SubscriptionStatus = 'active' | 'pending_payment' | 'expired' | 'cancelled' | 'none'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  durationType: DurationType
  customDays: number | null
  customUnit: CustomDurationUnit
  durationDays: number
  durationLabel: string
  price: number
  currency: string
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  accessAiChat: boolean
  heuresIncluses: number
  active: boolean
  isGracePlan: boolean
  isFreeOffer: boolean
  order: number
}

export interface SubscriptionPlanPayload {
  name: string
  description?: string
  durationType: DurationType
  customDays?: number
  customUnit?: CustomDurationUnit
  price: number
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  accessAiChat: boolean
  heuresIncluses: number
  active: boolean
  order: number
}

export interface SubscriptionUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface Subscription {
  id: string
  planName: string
  status: Exclude<SubscriptionStatus, 'none'>
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  accessAiChat: boolean
  heuresIncluses: number
  startAt: string | null
  endAt: string | null
  price: number
  user: SubscriptionUser
}

export interface LearnerSubscription {
  user: SubscriptionUser
  status: SubscriptionStatus
  subscription: Subscription | null
  pending: Subscription | null
  active: Subscription | null
}

export interface AssignSubscriptionPayload {
  userId: string
  planId: string
  activateNow?: boolean
  paymentNote?: string
}

export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'

export interface PaymentTransaction {
  id: string
  userId: string
  subscriptionId: string
  planId: string
  planName: string
  amount: number
  currency: string
  description: string
  status: PaymentStatus
  paymentUrl: string
  paymentMethod: string
  fedapayReference: string
  errorMessage: string
  activatedAt: string | null
  createdAt: string
  updatedAt: string
  learner: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  } | null
}

export function fetchSubscriptionPlans(token: string) {
  return apiFetch<{ plans: SubscriptionPlan[] }>('/api/admin/subscriptions/plans', {}, token)
}

export function createSubscriptionPlan(token: string, payload: SubscriptionPlanPayload) {
  return apiFetch<{ plan: SubscriptionPlan }>(
    '/api/admin/subscriptions/plans',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateSubscriptionPlan(
  token: string,
  planId: string,
  payload: Partial<SubscriptionPlanPayload>,
) {
  return apiFetch<{ plan: SubscriptionPlan }>(
    `/api/admin/subscriptions/plans/${planId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deactivateSubscriptionPlan(token: string, planId: string) {
  return apiFetch<{ plan: SubscriptionPlan }>(
    `/api/admin/subscriptions/plans/${planId}/deactivate`,
    { method: 'POST' },
    token,
  )
}

export function fetchSubscriptionLearners(token: string, status: SubscriptionStatus = 'active') {
  return apiFetch<{ learners: LearnerSubscription[] }>(
    `/api/admin/subscriptions/learners?status=${status}`,
    {},
    token,
  )
}

export function fetchPendingSubscriptions(token: string) {
  return apiFetch<{ subscriptions: Subscription[] }>('/api/admin/subscriptions/pending', {}, token)
}

export function activateSubscription(token: string, subscriptionId: string) {
  return apiFetch<{ subscription: Subscription }>(
    `/api/admin/subscriptions/${subscriptionId}/activate`,
    { method: 'POST' },
    token,
  )
}

export function cancelSubscription(token: string, subscriptionId: string) {
  return apiFetch<{ subscription: Subscription }>(
    `/api/admin/subscriptions/${subscriptionId}/cancel`,
    { method: 'POST' },
    token,
  )
}

export function changeSubscriptionPlan(token: string, subscriptionId: string, planId: string) {
  return apiFetch<{ subscription: Subscription }>(
    `/api/admin/subscriptions/${subscriptionId}/change-plan`,
    { method: 'POST', body: JSON.stringify({ planId }) },
    token,
  )
}

export function assignSubscription(token: string, payload: AssignSubscriptionPayload) {
  return apiFetch<{ subscription: Subscription }>(
    '/api/admin/subscriptions/assign',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function fetchPayments(token: string, status?: PaymentStatus | '') {
  const query = status ? `?status=${status}` : ''
  return apiFetch<{
    payments: PaymentTransaction[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/subscriptions/payments${query}`, {}, token)
}

/**
 * Flux SSE des paiements. EventSource ne permet pas d'en-tête Authorization,
 * donc on lit le flux nous-mêmes via fetch (headers standards, cohérent avec apiFetch).
 * Retourne une fonction pour se désabonner (ferme la connexion).
 */
export function subscribeToPaymentEvents(
  token: string,
  onPayment: (payment: PaymentTransaction) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  const controller = new AbortController()

  void (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${getApiOrigin()}/api/admin/subscriptions/payments/stream`, {
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
              const parsed = JSON.parse(line.slice(6)) as { type: string; payment: PaymentTransaction }
              if (parsed.type === 'payment.updated') onPayment(parsed.payment)
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
