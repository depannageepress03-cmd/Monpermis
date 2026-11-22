import Constants from 'expo-constants'
import { getApiBase } from './config'

export type AppVersionInfo = {
  latest: string | null
  minSupported: string | null
  apkUrl: string | null
  releaseNotes: string | null
}

function parseParts(version: string): number[] {
  return String(version)
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0))
}

/** Compare semver-ish strings. Returns negative if a < b. */
export function compareVersions(a: string, b: string): number {
  const left = parseParts(a)
  const right = parseParts(b)
  const len = Math.max(left.length, right.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function getInstalledAppVersion(): string {
  return (
    Constants.expoConfig?.version ||
    Constants.nativeApplicationVersion ||
    '0.0.0'
  )
}

export async function fetchAppVersionInfo(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(`${getApiBase()}/app/version`, { method: 'GET' })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: AppVersionInfo }
    return json.data || null
  } catch {
    return null
  }
}
