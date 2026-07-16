import { apiFetch } from './client'

export interface AdminUser {
  id: string
  fullName: string
  phone: string
  lastLoginAt?: string
  createdAt: string
}

interface AuthResponse {
  admin: AdminUser
  token: string
}

export function createAdmin(
  token: string,
  fullName: string,
  phone: string,
  password: string,
  confirmPassword: string,
) {
  return apiFetch<{ admin: AdminUser }>(
    '/api/admin/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, password, confirmPassword }),
    },
    token,
  )
}

export function loginAdmin(phone: string, password: string) {
  return apiFetch<AuthResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export function fetchAdminMe(token: string) {
  return apiFetch<{ admin: AdminUser }>('/api/admin/auth/me', {}, token)
}

export function fetchRegistrationStatus(token: string) {
  return apiFetch<{ allowed: boolean }>('/api/admin/auth/registration-status', {}, token)
}
