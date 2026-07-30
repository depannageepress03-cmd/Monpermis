import { getApiBase } from '../api/config'

function isAllowedAbsoluteMediaUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return (
    host === 'monpermis-api.onrender.com' ||
    host === 'monpermis.bj' ||
    host.endsWith('.monpermis.bj') ||
    host.endsWith('.cloudinary.com') ||
    host.endsWith('.render.com') ||
    host === 'res.cloudinary.com'
  )
}

/** Transforme un chemin relatif (/uploads/...) en URL absolue pour l’app mobile. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined
  const value = path.trim()
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      return isAllowedAbsoluteMediaUrl(parsed) ? parsed.toString() : undefined
    } catch {
      return undefined
    }
  }

  const apiBase = getApiBase().replace(/\/api\/?$/, '')
  return `${apiBase}${value.startsWith('/') ? value : `/${value}`}`
}
