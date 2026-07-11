import { getApiOrigin } from '../api/config'

/** Transforme `/uploads/...` en URL absolue quand `VITE_API_URL` est défini (prod Render). */
export function resolveMediaUrl(path?: string | null): string {
  if (!path?.trim()) return ''
  const value = path.trim()
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }
  const origin = getApiOrigin()
  const normalized = value.startsWith('/') ? value : `/${value}`
  return origin ? `${origin}${normalized}` : normalized
}
