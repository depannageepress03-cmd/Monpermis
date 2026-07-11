/** Origine de l’API (sans slash final). Vide en local → proxy Vite. */
export function getApiOrigin(): string {
  return String(import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/\/$/, '')
}

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
