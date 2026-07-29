import Constants from 'expo-constants'
import { Platform } from 'react-native'

function getExpoDevApiBase(): string | null {
  const host =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost

  if (!host) return null

  const ip = host.split(':')[0]
  if (!ip) return null

  return `http://${ip}:5001/api`
}

export function getApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()

  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`
  }

  // Filet de sécurité : jamais localhost dans un binaire release.
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return 'https://monpermis-api.onrender.com/api'
  }

  const expoDevApi = getExpoDevApiBase()
  if (expoDevApi) {
    return expoDevApi
  }

  if (Platform.OS === 'android') {
    // 5001 : sur macOS le port 5000 est souvent pris par AirPlay.
    return 'http://10.0.2.2:5001/api'
  }

  return 'http://localhost:5001/api'
}

