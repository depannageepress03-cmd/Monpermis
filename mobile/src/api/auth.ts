import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApiBase } from './config'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

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
  let response: Response

  try {
    response = await fetch(`${getApiBase()}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
  } catch {
    throw new AuthError(
      'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
    )
  }

  let body: ApiResponse<T>
  try {
    body = await response.json()
  } catch {
    throw new AuthError('Réponse serveur invalide')
  }

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

export function forgotPassword(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function verifyEmail(token: string) {
  return request<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function deleteAccount(data: { password?: string; confirm: boolean }) {
  return authedRequest<{ deleted: boolean }>('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify(data),
  })
}

async function authedRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken()
  if (!token) throw new AuthError('Authentification requise')
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
}

export function updateProfile(data: {
  firstName?: string
  lastName?: string
  phone?: string
}) {
  return authedRequest<{ user: AuthUser }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  return authedRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function saveSession(token: string, user: AuthUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ])
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
    return null
  }
}
