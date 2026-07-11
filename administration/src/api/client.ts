import { getApiOrigin, resolveMediaUrl } from '../utils/mediaUrl'

const API_BASE = getApiOrigin()

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export { resolveMediaUrl }

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>

  if (!response.ok || !body.success) {
    throw new ApiError(body.error ?? 'Erreur réseau', response.status)
  }

  return body.data as T
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<T> {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>

  if (!response.ok || !body.success) {
    throw new ApiError(body.error ?? 'Erreur réseau', response.status)
  }

  return body.data as T
}
