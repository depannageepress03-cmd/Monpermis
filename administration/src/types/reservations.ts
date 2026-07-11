export interface Moniteur {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  specialties: string[]
  vehicleTypes: string[]
  active: boolean
  defaultPriceFcfa: number
  vehicleBrand: string
  vehiclePhotoUrl: string
}

export interface Creneau {
  id: string
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType: string
  status: 'libre' | 'reserve' | 'bloque'
  priceFcfa: number
}

export interface ReservationAdmin {
  id: string
  status: string
  paymentStatus: string
  paymentRef: string
  priceFcfa: number
  vehicleType: string
  cancellationReason?: string
  cancelledBy?: string
  cancelledAt?: string
  user: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
  } | null
  moniteur: {
    id: string
    fullName: string
    vehicleBrand?: string
    vehiclePhotoUrl?: string
  } | null
  creneau: Creneau | null
  createdAt?: string
}
