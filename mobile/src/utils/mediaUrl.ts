import { getApiBase } from '../api/config'

/** Transforme un chemin relatif (/uploads/...) en URL absolue pour l’app mobile. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined
  const value = path.trim()
  if (/^https?:\/\//i.test(value)) return value

  const apiBase = getApiBase().replace(/\/api\/?$/, '')
  return `${apiBase}${value.startsWith('/') ? value : `/${value}`}`
}
