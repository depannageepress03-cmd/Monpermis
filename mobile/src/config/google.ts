import { Platform } from 'react-native'

export function getGoogleClientIds() {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || ''
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || ''
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || ''
  return { web, ios, android }
}

/** Message si la config OAuth Google est incomplète pour cette plateforme. */
export function getGoogleConfigError(): string | null {
  const { web, ios } = getGoogleClientIds()
  if (!web) {
    return 'Connexion Google non configurée pour cette version (client Web manquant).'
  }
  if (Platform.OS === 'ios' && !ios) {
    return 'Connexion Google non configurée pour iOS.'
  }
  return null
}
