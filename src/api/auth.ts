import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  email?: string
}

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  authProvider?: 'local' | 'google'
  isEmailVerified?: boolean
  createdAt: string
}

interface AuthData {
  user: AuthUser
  token: string
}

export class AuthError extends Error {
  code?: string
  email?: string

  constructor(message: string, code?: string, email?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.email = email
  }
}

export function getAuthErrorDetails(error: unknown): { code?: string; email?: string; message: string } {
  if (error instanceof AuthError) {
    return { code: error.code, email: error.email, message: error.message }
  }
  if (error instanceof Error) {
    const authLike = error as AuthError
    return { code: authLike.code, email: authLike.email, message: error.message }
  }
  return { message: 'Une erreur est survenue' }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  const body: ApiResponse<T> = await response.json()

  if (!response.ok || !body.success) {
    throw new AuthError(body.error || 'Une erreur est survenue', body.code, body.email)
  }

  return body.data as T
}

export function registerUser(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}) {
  return request<AuthData & { message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function loginUser(data: { email: string; password: string }) {
  return request<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function loginWithGoogle(idToken: string) {
  return request<AuthData>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
}

export function saveSession(token: string, user: AuthUser, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage
  storage.setItem('token', token)
  storage.setItem('user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}
