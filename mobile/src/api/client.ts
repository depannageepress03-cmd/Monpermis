import { getApiBase } from './config'
import { getStoredToken, invalidateSessionIfUnauthorized } from './session'

export interface ApiResponseBody<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  email?: string
}

export class ApiError extends Error {
  code?: string
  email?: string
  status?: number

  constructor(message: string, options?: { code?: string; email?: string; status?: number }) {
    super(message)
    this.name = 'ApiError'
    this.code = options?.code
    this.email = options?.email
    this.status = options?.status
  }
}

export type ApiRequestOptions = RequestInit & {
  /** Require Bearer token (default true for authed helpers). */
  auth?: boolean
  /** Network retries on fetch failure (default 0; access uses 2). */
  retries?: number
  /** Allow success:false / missing data without throwing — caller inspects body. */
  raw?: boolean
}

const NETWORK_MSG =
  'Impossible de joindre le serveur. Vérifiez votre connexion internet.'

function mergeHeaders(
  base: Record<string, string>,
  extra?: HeadersInit,
): Record<string, string> {
  if (!extra) return base
  if (extra instanceof Headers) {
    const out = { ...base }
    extra.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  if (Array.isArray(extra)) {
    const out = { ...base }
    for (const [key, value] of extra) out[key] = value
    return out
  }
  return { ...base, ...(extra as Record<string, string>) }
}

async function fetchWithRetries(
  url: string,
  init: RequestInit,
  retries: number,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init)
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(NETWORK_MSG)
}

/**
 * Client HTTP unique pour l’app mobile.
 * - X-Client: mobile
 * - Bearer optionnel
 * - invalidation session sur 401
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = false, retries = 0, raw: _raw, headers, ...rest } = options

  const requestHeaders: Record<string, string> = mergeHeaders(
    {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
    },
    headers,
  )

  if (auth) {
    const token = await getStoredToken()
    if (!token) throw new ApiError('Authentification requise', { status: 401 })
    requestHeaders.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetchWithRetries(`${getApiBase()}${path}`, { ...rest, headers: requestHeaders }, retries)
  } catch {
    throw new ApiError(NETWORK_MSG)
  }

  let body: ApiResponseBody<T>
  try {
    body = (await response.json()) as ApiResponseBody<T>
  } catch {
    throw new ApiError('Réponse serveur invalide', { status: response.status })
  }

  if (!response.ok || !body.success || body.data === undefined) {
    if (auth || requestHeaders.Authorization) {
      await invalidateSessionIfUnauthorized(response.status)
    }
    throw new ApiError(body.error || 'Une erreur est survenue', {
      code: body.code,
      email: body.email,
      status: response.status,
    })
  }

  return body.data
}

/** Requête authentifiée (Bearer obligatoire). */
export function apiAuthed<T>(path: string, options: Omit<ApiRequestOptions, 'auth'> = {}) {
  return apiRequest<T>(path, { ...options, auth: true })
}

/** Requête publique (pas de Bearer). */
export function apiPublic<T>(path: string, options: Omit<ApiRequestOptions, 'auth'> = {}) {
  return apiRequest<T>(path, { ...options, auth: false })
}

/** Auth + retries réseau (paiements / access). */
export function apiAuthedRetry<T>(path: string, options: Omit<ApiRequestOptions, 'auth' | 'retries'> = {}) {
  return apiRequest<T>(path, { ...options, auth: true, retries: 2 })
}
