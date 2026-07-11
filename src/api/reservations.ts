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
}

export const fetchDrivingDashboard = () =>
  request<{ progress: DrivingProgress; upcoming: ReservationItem[] }>('/reservations/dashboard')

export const fetchPublicMoniteurs = (vehicleType?: string) => {
  const query = vehicleType
    ? `?vehicleType=${encodeURIComponent(vehicleType)}`
    : ''
  return request<{ moniteurs: MoniteurPublic[] }>(`/reservations/moniteurs${query}`)
}

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

export const createReservation = (payload: {
  creneauId: string
  vehicleType: string
  moniteurId?: string
  paymentRef?: string
}) =>
  request<{
    reservation: ReservationItem
    whatsappLink: string
    calendarHint: { title: string; date: string; startTime: string; endTime: string }
  }>('/reservations/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const cancelReservation = (id: string, reason: string) =>
  request<{ reservation: ReservationItem }>(`/reservations/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
