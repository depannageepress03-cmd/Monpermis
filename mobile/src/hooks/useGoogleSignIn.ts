import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

function getMissingGoogleConfigMessage() {
  if (!webClientId) {
    return 'Ajoutez EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID dans mobile/.env'
  }
  if (Platform.OS === 'android' && !androidClientId) {
    return 'Ajoutez EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID dans mobile/.env'
  }
  if (Platform.OS === 'ios' && !iosClientId) {
    return 'Ajoutez EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID dans mobile/.env'
  }
  return null
}

export function useGoogleSignIn(onSuccess: (idToken: string) => Promise<void>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configError = useMemo(() => getMissingGoogleConfigMessage(), [])

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId ?? 'missing-web-client-id.apps.googleusercontent.com',
    iosClientId: iosClientId ?? webClientId ?? 'missing-ios-client-id.apps.googleusercontent.com',
    androidClientId: androidClientId ?? webClientId ?? 'missing-android-client-id.apps.googleusercontent.com',
  })

  useEffect(() => {
    if (!response) return

    if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false)
      return
    }

    if (response.type !== 'success') {
      if (response.type === 'error') {
        setError('Connexion Google annulée ou échouée')
        setLoading(false)
      }
      return
    }

    const idToken = response.params.id_token
    if (!idToken) {
      setError('Token Google manquant')
      setLoading(false)
      return
    }

    onSuccess(idToken)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Connexion Google échouée')
      })
      .finally(() => setLoading(false))
  }, [response, onSuccess])

  const signInWithGoogle = async () => {
    if (configError) {
      setError(configError)
      return
    }

    setError(null)
    setLoading(true)

    try {
      await promptAsync()
    } catch {
      setError('Connexion Google échouée')
      setLoading(false)
    }
  }

  return {
    signInWithGoogle,
    loading,
    error,
    disabled: !request || !!configError,
  }
}
