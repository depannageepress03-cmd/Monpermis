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
  email?: string
  phone: string
  authProvider?: 'local' | 'google'
  isEmailVerified?: boolean
  createdAt: string
}

interface AuthData {
  user: AuthUser
  token: string
  needsPhone?: boolean
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

  let body: ApiResponse<T>
  try {
    body = await response.json()
  } catch {
    throw new AuthError(
      response.statusText || 'Le serveur est inaccessible. Vérifiez votre connexion.',
    )
  }

  if (!response.ok || !body.success) {
    throw new AuthError(body.error || 'Une erreur est survenue', body.code, body.email)
  }

  return body.data as T
}

export function registerUser(data: {
  firstName: string
  lastName: string
  phone: string
  password: string
  email?: string
}) {
  return request<{ message: string; email?: string; phone?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function loginUser(data: { phone?: string; identifier?: string; password: string }) {
  const phone = (data.phone || data.identifier || '').trim()
  return request<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      identifier: phone,
      password: data.password,
    }),
  })
}

export interface GoogleAuthConfig {
  enabled: boolean
  clientId: string
  androidClientId: string
  iosClientId: string
}

/** ID client Google (web) exposé par le serveur — null si Google non configuré. */
export function getGoogleAuthConfig() {
  return request<GoogleAuthConfig>('/auth/google/config')
}

/** Échange un ID token Google contre une session Monpermis (login ou inscription). */
export function loginWithGoogle(idToken: string) {
  return request<AuthData>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, client: 'web' }),
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

export function getStoredToken(): string | null {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

export function onSessionInvalidated(listener: SessionInvalidatedListener) {
  sessionInvalidatedListeners.add(listener)
  return () => {
    sessionInvalidatedListeners.delete(listener)
  }
}

/** Efface la session locale quand l’API renvoie 401 (JWT invalide / expiré). */
export function invalidateSessionIfUnauthorized(status: number) {
  if (status === 401) {
    clearSession()
    for (const listener of sessionInvalidatedListeners) listener()
  }
}
