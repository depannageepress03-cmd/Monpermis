import { apiAuthed, ApiError } from './client'

export class ReservationError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ReservationError'
    this.code = code
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiAuthed<T>(path, options)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ReservationError(error.message, error.code)
    }
    throw new ReservationError('Action impossible')
  }
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
  status: string
  priceFcfa: number
  available: boolean
  moniteur: {
    id: string
    fullName: string
    vehicleBrand?: string
    vehiclePhotoUrl?: string
  } | null
}

export interface ReservationItem {
  id: string
  status: string
  paymentStatus: string
  paymentRef: string
  priceFcfa: number
  vehicleType: string
  canCancel: boolean
  cancellationReason?: string
  moniteur: {
    id: string
    fullName: string
    phone?: string
    vehicleBrand?: string
    vehiclePhotoUrl?: string
  } | null
  creneau: {
    id: string
    date: string
    startTime: string
    endTime: string
    priceFcfa: number
  } | null
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
}

export interface MoniteurProfile extends MoniteurPublic {
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

export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

/** Préavis minimal aligné sur le serveur : aucun créneau réservable avant. */
export const BOOKING_LEAD_MINUTES = 60
export {
  HOURS_DISCOUNT_FCFA,
  HOURS_DISCOUNT_MIN_HOURS,
  computeDrivingAmount,
} from '../utils/pricing'

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

export function fetchDrivingDashboard() {
  return request<{ progress: DrivingProgress; upcoming: ReservationItem[] }>(
    '/reservations/dashboard',
  )
}

export async function fetchMyReservations() {
  try {
    return await request<{ reservations: ReservationItem[] }>('/reservations/mine')
  } catch {
    const dash = await fetchDrivingDashboard()
    return { reservations: dash.upcoming }
  }
}

export function fetchPublicMoniteurs(vehicleType?: string) {
  const query = vehicleType
    ? `?vehicleType=${encodeURIComponent(vehicleType)}`
    : ''
  return request<{ moniteurs: MoniteurPublic[] }>(`/reservations/moniteurs${query}`)
}

export function fetchMoniteurProfile(id: string) {
  return request<{ moniteur: MoniteurProfile }>(`/reservations/moniteurs/${id}`)
}

export function fetchMoniteurAvailability(params: {
  moniteurId: string
  days?: number
  from?: string
}) {
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
  }>(`/reservations/availability?${query.toString()}`)
}

export function requestReservationSlot(payload: {
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType?: string
}) {
  return request<{
    creneau: ReservationSlot
    hours: number
    amountFcfa: number
    hoursDiscountFcfa: number
    lockedUntil: string
  }>('/reservations/request-slot', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchAvailableCreneaux(params: {
  vehicleType?: string
  moniteurId?: string
  from?: string
  days?: number
}) {
  const query = new URLSearchParams({
    days: String(params.days ?? 14),
  })
  if (params.vehicleType) query.set('vehicleType', params.vehicleType)
  if (params.moniteurId) query.set('moniteurId', params.moniteurId)
  if (params.from) query.set('from', params.from)
  return request<{
    from: string
    to: string
    days: { date: string; creneaux: ReservationSlot[] }[]
  }>(`/reservations/creneaux?${query.toString()}`)
}

export function lockCreneau(creneauId: string) {
  return request<{ creneau: ReservationSlot; lockedUntil: string }>(
    `/reservations/creneaux/${creneauId}/lock`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export function createReservation(payload: {
  creneauId?: string
  creneauIds?: string[]
  vehicleType: string
  moniteurId?: string
  paymentMethod?: 'solde' | 'mobile_money'
  operator?: MobileMoneyOperator
  phone?: string
  country?: string
}) {
  return request<{
    paymentMethod: 'solde' | 'mobile_money'
    bookingGroupId: string
    reservations?: ReservationItem[]
    reservation?: ReservationItem
    whatsappLink?: string
    calendarHint?: {
      title: string
      date: string
      startTime: string
      endTime: string
    }
    payment?: { id: string; status: string; amount: number; currency: string }
    message?: string
  }>('/reservations/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function syncReservationPayment(bookingGroupId: string) {
  return request<{
    payment: { status: string; errorMessage?: string }
    reservations: ReservationItem[]
    /** true quand paiement approved ET toutes les réservations sont confirmed. */
    confirmed?: boolean
  }>(`/reservations/checkout/${bookingGroupId}/sync`)
}

export function cancelReservation(reservationId: string, reason: string) {
  return request<{ reservation: ReservationItem }>(
    `/reservations/reservations/${reservationId}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}
