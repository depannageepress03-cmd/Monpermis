import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { cacheClearAll } from '../utils/contentCache'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
/** Ancienne clé AsyncStorage — migrée puis effacée. */
const LEGACY_TOKEN_KEY = 'token'

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

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

export function onSessionInvalidated(listener: SessionInvalidatedListener) {
  sessionInvalidatedListeners.add(listener)
  return () => {
    sessionInvalidatedListeners.delete(listener)
  }
}

function notifySessionInvalidated() {
  for (const listener of sessionInvalidatedListeners) listener()
}

async function readSecureToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

async function writeSecureToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

async function deleteSecureToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** Migre un JWT encore présent dans AsyncStorage vers SecureStore. */
async function migrateLegacyToken(): Promise<string | null> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_TOKEN_KEY)
    if (!legacy) return null
    await writeSecureToken(legacy)
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY)
    return legacy
  } catch {
    return null
  }
}

export async function saveSession(token: string, user: AuthUser) {
  await writeSecureToken(token)
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
  // Nettoyage si une ancienne clé plain-text trainait.
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY)
}

export async function clearSession() {
  await deleteSecureToken()
  await AsyncStorage.multiRemove([USER_KEY, LEGACY_TOKEN_KEY])
  await cacheClearAll().catch(() => undefined)
}

export async function getStoredToken(): Promise<string | null> {
  const secure = await readSecureToken()
  if (secure) return secure
  return migrateLegacyToken()
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    await clearSession()
    return null
  }
}

/** Efface la session locale quand l’API renvoie 401 (JWT invalide / expiré). */
export async function invalidateSessionIfUnauthorized(status: number) {
  if (status === 401) {
    await clearSession()
    notifySessionInvalidated()
  }
}
