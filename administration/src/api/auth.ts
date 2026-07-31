import { apiFetch } from './client'

export interface AdminUser {
  id: string
  fullName: string
  phone: string
  role?: 'admin' | 'superadmin' | string
  isActive?: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface LoginOptions {
  portal?: 'ops' | 'direction'
  accessKey?: string
}

interface AuthResponse {
  admin: AdminUser
  token: string
  homePath?: string
}

export function createAdmin(
  token: string,
  fullName: string,
  phone: string,
  password: string,
  confirmPassword: string,
  role: 'admin' | 'superadmin' = 'admin',
  accessKey?: string,
) {
  return apiFetch<{ admin: AdminUser }>(
    '/api/admin/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        phone,
        password,
        confirmPassword,
        role,
        ...(role === 'superadmin' && accessKey ? { accessKey } : {}),
      }),
    },
    token,
  )
}

export function loginAdmin(phone: string, password: string, options: LoginOptions = {}) {
  return apiFetch<AuthResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      password,
      portal: options.portal || 'ops',
      ...(options.accessKey ? { accessKey: options.accessKey } : {}),
    }),
  })
}

export interface AdminCapabilities {
  manageAdmins: boolean
  viewFinances?: boolean
  viewActivity?: boolean
  manageRefunds?: boolean
}

export function fetchAdminMe(token: string) {
  return apiFetch<{ admin: AdminUser; capabilities?: AdminCapabilities }>(
    '/api/admin/auth/me',
    {},
    token,
  )
}

export function fetchRegistrationStatus(token: string) {
  return apiFetch<{ allowed: boolean }>('/api/admin/auth/registration-status', {}, token)
}
