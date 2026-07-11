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
}

export function fetchDrivingDashboard() {
  return request<{ progress: DrivingProgress; upcoming: ReservationItem[] }>(
    '/reservations/dashboard',
  )
}

export function fetchPublicMoniteurs(vehicleType?: string) {
  const query = vehicleType
    ? `?vehicleType=${encodeURIComponent(vehicleType)}`
    : ''
  return request<{ moniteurs: MoniteurPublic[] }>(`/reservations/moniteurs${query}`)
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
  creneauId: string
  vehicleType: string
  moniteurId?: string
  paymentRef?: string
}) {
  return request<{
    reservation: ReservationItem
    whatsappLink: string
    calendarHint: {
      title: string
      date: string
      startTime: string
      endTime: string
    }
  }>('/reservations/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitPaymentRef(reservationId: string, paymentRef: string) {
  return request<{ reservation: ReservationItem }>(
    `/reservations/reservations/${reservationId}/payment-ref`,
    { method: 'POST', body: JSON.stringify({ paymentRef }) },
  )
}

export function cancelReservation(reservationId: string, reason: string) {
  return request<{ reservation: ReservationItem }>(
    `/reservations/reservations/${reservationId}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}
