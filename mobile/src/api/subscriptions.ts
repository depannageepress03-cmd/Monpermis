import { getStoredToken } from './auth'
import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export class SubscriptionError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SubscriptionError'
    this.code = code
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken()
  if (!token) throw new SubscriptionError('Authentification requise')

  let response: Response
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    })
  } catch {
    throw new SubscriptionError('Impossible de joindre le serveur')
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new SubscriptionError(body.error ?? 'Action impossible', body.code)
  }
  return body.data
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  durationType: 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'
  durationDays: number
  durationLabel: string
  price: number
  currency: string
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  heuresIncluses: number
  isFreeOffer: boolean
}

export interface UserSubscription {
  id: string
  planId: string
  planName: string
  status: 'pending_payment' | 'active' | 'expired' | 'cancelled'
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  heuresIncluses: number
  startAt: string | null
  endAt: string | null
  price: number
  currency: string
  durationDays: number
  createdAt: string
}

export interface PaymentTransaction {
  id: string
  subscriptionId: string
  planId: string
  amount: number
  currency: string
  description: string
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
  paymentUrl: string
  paymentMethod: string
  fedapayReference: string
  errorMessage: string
  activatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionAccess {
  hasActiveSubscription: boolean
  accessCode: boolean
  accessConduite: boolean
  accessECodepermis: boolean
  subscription: UserSubscription | null
  pendingSubscription: UserSubscription | null
  history: UserSubscription[]
  freeOfferUsed: boolean
  payments?: PaymentTransaction[]
  latestPayment?: PaymentTransaction | null
  fedapayPublicKey?: string
  user: {
    soldeHeures: number
    heuresEffectuees: number
    heuresObjectif: number
  }
}

export const fetchSubscriptionMe = () => request<SubscriptionAccess>('/subscriptions/me')

export const fetchSubscriptionPlans = () =>
  request<{ plans: SubscriptionPlan[] }>('/subscriptions/plans').then((data) => data.plans)

export const subscribeToPlan = (planId: string) =>
  request<{
    subscription: UserSubscription
    payment: PaymentTransaction
    access: SubscriptionAccess
    message: string
  }>('/subscriptions/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  })

export const fetchPaymentStatus = (paymentId: string) =>
  request<{ payment: PaymentTransaction; access: SubscriptionAccess }>(
    `/subscriptions/payments/${paymentId}`,
  )

export const syncPaymentStatus = (paymentId: string) =>
  request<{ payment: PaymentTransaction; access: SubscriptionAccess }>(
    `/subscriptions/payments/${paymentId}/sync`,
    { method: 'POST' },
  )
