import { getStoredToken } from './auth'
import { getApiBase } from './config'

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
  const token = await getStoredToken()
  if (!token) throw new ReservationError('Authentification requise')

  let response: Response
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options?.headers as Record<string, string> | undefined),
      },
    })
  } catch {
    throw new ReservationError('Impossible de joindre le serveur')
  }

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

export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

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
  }>(`/reservations/checkout/${bookingGroupId}/sync`)
}

export function cancelReservation(reservationId: string, reason: string) {
  return request<{ reservation: ReservationItem }>(
    `/reservations/reservations/${reservationId}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}
