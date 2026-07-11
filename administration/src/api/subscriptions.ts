import { apiFetch } from './client'

export type DurationType = 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'
export type SubscriptionStatus = 'active' | 'pending_payment' | 'expired' | 'cancelled' | 'none'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  durationType: DurationType
  customDays: number | null
  durationDays: number
  durationLabel: string
  price: number
  currency: string
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  heuresIncluses: number
  active: boolean
  isGracePlan: boolean
  order: number
}

export interface SubscriptionPlanPayload {
  name: string
  description?: string
  durationType: DurationType
  customDays?: number
  price: number
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
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

export function assignSubscription(token: string, payload: AssignSubscriptionPayload) {
  return apiFetch<{ subscription: Subscription }>(
    '/api/admin/subscriptions/assign',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}
