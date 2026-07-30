import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = '@mp/cache/v1:'
const INDEX_KEY = '@mp/cache/v1:__index'
const MAX_ENTRIES = 48
const DEFAULT_TTL_MS = 30 * 60 * 1000

type CacheEntry<T> = {
  savedAt: number
  data: T
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeIndex(keys: string[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(keys.slice(-MAX_ENTRIES)))
}

async function touchIndex(key: string) {
  const index = await readIndex()
  const next = [...index.filter((item) => item !== key), key]
  while (next.length > MAX_ENTRIES) {
    const evicted = next.shift()
    if (evicted) await AsyncStorage.removeItem(`${PREFIX}${evicted}`)
  }
  await writeIndex(next)
}

export async function cacheGet<T>(
  key: string,
  maxAgeMs = DEFAULT_TTL_MS,
): Promise<{ data: T; stale: boolean; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (!entry || entry.data === undefined || typeof entry.savedAt !== 'number') return null
    const age = Date.now() - entry.savedAt
    return { data: entry.data, stale: age > maxAgeMs, savedAt: entry.savedAt }
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, data: T) {
  const entry: CacheEntry<T> = { savedAt: Date.now(), data }
  await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(entry))
  await touchIndex(key)
}

/**
 * Affiche le cache immédiatement (même périmé), puis rafraîchit en arrière-plan.
 * `onData` est appelé 1–2 fois : cache puis réseau.
 */
export async function cacheGetThenFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    maxAgeMs?: number
    onData?: (data: T, meta: { fromCache: boolean; stale: boolean }) => void
  },
): Promise<T> {
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_TTL_MS
  const cached = await cacheGet<T>(key, maxAgeMs)
  if (cached) {
    options?.onData?.(cached.data, { fromCache: true, stale: cached.stale })
    if (!cached.stale) return cached.data
  }

  const fresh = await fetcher()
  await cacheSet(key, fresh)
  options?.onData?.(fresh, { fromCache: false, stale: false })
  return fresh
}

/** Vide tout le cache contenu (logout / changement de compte). */
export async function cacheClearAll() {
  const index = await readIndex()
  await Promise.all(index.map((key) => AsyncStorage.removeItem(`${PREFIX}${key}`)))
  await AsyncStorage.removeItem(INDEX_KEY)
}
