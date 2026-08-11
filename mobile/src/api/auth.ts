import { apiAuthed, apiPublic, ApiError } from './client'
import { getApiBase } from './config'
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  invalidateSessionIfUnauthorized,
  onSessionInvalidated,
  saveSession,
  type AuthUser,
} from './session'

export type { AuthUser }
export {
  clearSession,
  getStoredToken,
  getStoredUser,
  invalidateSessionIfUnauthorized,
  onSessionInvalidated,
  saveSession,
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

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error
  if (error instanceof ApiError) {
    return new AuthError(error.message, error.code, error.email)
  }
  if (error instanceof Error) return new AuthError(error.message)
  return new AuthError('Une erreur est survenue')
}

export function getAuthErrorDetails(error: unknown): { code?: string; email?: string; message: string } {
  const authError = toAuthError(error)
  return { code: authError.code, email: authError.email, message: authError.message }
}

async function publicAuth<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiPublic<T>(path, options)
  } catch (error) {
    throw toAuthError(error)
  }
}

async function authedAuth<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiAuthed<T>(path, options)
  } catch (error) {
    throw toAuthError(error)
  }
}

export function registerUser(data: {
  firstName: string
  lastName: string
  phone: string
  password: string
  email?: string
}) {
  return publicAuth<{ message: string; email?: string; phone?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function loginUser(data: { phone?: string; identifier?: string; password: string }) {
  const phone = (data.phone || data.identifier || '').trim()
  return publicAuth<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      identifier: phone,
      password: data.password,
      client: 'mobile',
    }),
  })
}

export interface GoogleAuthConfig {
  enabled: boolean
  clientId: string
  androidClientId: string
  iosClientId: string
}

/** Config Google OAuth exposée par le serveur (null si Google non configuré). */
export function getGoogleAuthConfig() {
  return publicAuth<GoogleAuthConfig>('/auth/google/config')
}

/** Échange un ID token Google contre une session Monpermis (login ou inscription). */
export function loginWithGoogle(idToken: string) {
  return publicAuth<AuthData>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, client: 'mobile' }),
  })
}

export function forgotPassword(email: string) {
  return publicAuth<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string) {
  return publicAuth<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function verifyEmail(token: string) {
  return publicAuth<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function resendVerificationEmail(email: string) {
  return publicAuth<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function deleteAccount(data: { password?: string; confirm: boolean }) {
  return authedAuth<{ deleted: boolean }>('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify(data),
  })
}

export function updateProfile(data: {
  firstName?: string
  lastName?: string
  phone?: string
}) {
  return authedAuth<{ user: AuthUser }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  return authedAuth<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** Sonde légère : false si le token est rejeté (401). Hors-ligne → true (conserve la session). */
export async function probeSession(): Promise<boolean> {
  const token = await getStoredToken()
  if (!token) return false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(`${getApiBase()}/access-requests/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Client': 'mobile',
      },
      signal: controller.signal,
    })
    if (response.status === 401) {
      await invalidateSessionIfUnauthorized(401)
      return false
    }
    return response.ok
  } catch {
    // Timeout / hors-ligne : on garde la session locale.
    return true
  } finally {
    clearTimeout(timer)
  }
}
