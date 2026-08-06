import { apiFetch } from './client'

export interface MoniteurUser {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  activeLogin: boolean
  photoUrl?: string
  city?: string
}

interface AuthResponse {
  moniteur: MoniteurUser
  token: string
  homePath?: string
}

export function loginMoniteur(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/moniteur/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchMoniteurMe(token: string) {
  return apiFetch<{ moniteur: MoniteurUser }>('/api/moniteur/auth/me', {}, token)
}
