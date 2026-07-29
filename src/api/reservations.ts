import { getApiBase } from './config'

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class ReservationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReservationError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new ReservationError('Authentification requise')
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new ReservationError(body.error ?? 'Action impossible')
  }
  return body.data
}

export interface DrivingProgress {
  soldeHeures: number
  heuresEffectuees: number
  heuresObjectif: number
  percent: number
  label: string
}

export interface ReservationSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  vehicleType: string
  available: boolean
  priceFcfa: number
  moniteur: {
    id: string
    fullName: string
    vehicleBrand?: string
    vehiclePhotoUrl?: string
    photoUrl?: string
  } | null
}

export interface ReservationItem {
  id: string
  status: string
  paymentStatus: string
  priceFcfa: number
  vehicleType: string
  canCancel: boolean
  cancellationReason?: string
  moniteur: {
    id: string
    fullName: string
    vehicleBrand?: string
    vehiclePhotoUrl?: string
    photoUrl?: string
  } | null
  creneau: { date: string; startTime: string; endTime: string } | null
}

export interface MoniteurPublic {
  id: string
  fullName: string
  vehicleTypes: string[]
  defaultPriceFcfa: number
  vehicleBrand?: string
  vehiclePhotoUrl?: string
  photoUrl?: string
  city?: string
  weeklyAvailability?: { dayOfWeek: number; start: string; end: string }[]
}

export interface MoniteurProfile extends MoniteurPublic {
  phone: string
  specialties: string[]
  bio: string
  photos: string[]
  videos: string[]
}

export interface AvailabilityWindow {
  start: string
  end: string
}

export interface AvailabilityDay {
  date: string
  windows: AvailabilityWindow[]
}

/** Préavis minimal aligné sur le serveur : aucun créneau réservable avant. */
export const BOOKING_LEAD_MINUTES = 60
export const HOURS_DISCOUNT_FCFA = 1000
export const HOURS_DISCOUNT_MIN_HOURS = 2

/** Même règle serveur : remise forfaitaire unique dès 2 h réservées ensemble. */
export function computeDrivingAmount(
  hourlyPrice: number,
  hours: number,
  discount = HOURS_DISCOUNT_FCFA,
  minHours = HOURS_DISCOUNT_MIN_HOURS,
) {
  const base = Math.round(Math.max(0, Number(hourlyPrice) || 0) * Math.max(0, Number(hours) || 0))
  if ((Number(hours) || 0) < minHours) return base
  return Math.max(0, base - discount)
}

/** Heure la plus tôt réservable pour une date donnée, ou null si aucune contrainte. */
export function earliestBookableTime(date: string, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
  if (date !== today) return null
  const minutes = now.getHours() * 60 + now.getMinutes() + BOOKING_LEAD_MINUTES
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 23) return '23:59'
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const fetchDrivingDashboard = () =>
  request<{ progress: DrivingProgress; upcoming: ReservationItem[] }>('/reservations/dashboard')

export const fetchPublicMoniteurs = (vehicleType?: string) => {
  const query = vehicleType
    ? `?vehicleType=${encodeURIComponent(vehicleType)}`
    : ''
  return request<{ moniteurs: MoniteurPublic[] }>(`/reservations/moniteurs${query}`)
}

export const fetchMoniteurProfile = (id: string) =>
  request<{ moniteur: MoniteurProfile }>(`/reservations/moniteurs/${id}`)

export const fetchMoniteurAvailability = (params: {
  moniteurId: string
  days?: number
  from?: string
}) => {
  const query = new URLSearchParams({
    moniteurId: params.moniteurId,
    days: String(params.days ?? 14),
  })
  if (params.from) query.set('from', params.from)
  return request<{
    moniteur: MoniteurPublic
    from: string
    to: string
    hourlyPriceFcfa: number
    hoursDiscountFcfa?: number
    hoursDiscountMinHours?: number
    days: AvailabilityDay[]
  }>(`/reservations/availability?${query}`)
}

export const requestReservationSlot = (payload: {
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType?: string
}) =>
  request<{
    creneau: ReservationSlot
    hours: number
    amountFcfa: number
    hoursDiscountFcfa: number
    lockedUntil: string
  }>('/reservations/request-slot', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchAvailableCreneaux = (params: {
  vehicleType?: string
  moniteurId?: string
}) => {
  const query = new URLSearchParams({ days: '14' })
  if (params.vehicleType) query.set('vehicleType', params.vehicleType)
  if (params.moniteurId) query.set('moniteurId', params.moniteurId)
  return request<{ days: { date: string; creneaux: ReservationSlot[] }[] }>(
    `/reservations/creneaux?${query}`,
  )
}

export const lockCreneau = (id: string) =>
  request(`/reservations/creneaux/${id}/lock`, { method: 'POST', body: '{}' })

export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

export const createReservation = (payload: {
  creneauIds: string[]
  vehicleType: string
  moniteurId?: string
  paymentMethod: 'solde' | 'mobile_money'
  operator?: MobileMoneyOperator
  phone?: string
  country?: string
}) =>
  request<{
    paymentMethod: 'solde' | 'mobile_money'
    bookingGroupId: string
    reservations?: ReservationItem[]
    whatsappLink?: string
    calendarHint?: { title: string; date: string; startTime: string; endTime: string }
    payment?: { id: string; status: string; amount: number; currency: string }
    message?: string
  }>('/reservations/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const syncReservationPayment = (bookingGroupId: string) =>
  request<{
    payment: { status: string; errorMessage?: string }
    reservations: ReservationItem[]
  }>(`/reservations/checkout/${bookingGroupId}/sync`)

export const cancelReservation = (id: string, reason: string) =>
  request<{ reservation: ReservationItem }>(`/reservations/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
