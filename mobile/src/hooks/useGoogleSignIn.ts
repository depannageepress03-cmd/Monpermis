import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || ''
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || ''
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || ''

function getMissingGoogleConfigMessage() {
  if (!webClientId) {
    return 'Connexion Google non configurée pour cette version.'
  }
  if (Platform.OS === 'android' && !androidClientId && !webClientId) {
    return 'Connexion Google non configurée pour Android.'
  }
  if (Platform.OS === 'ios' && !iosClientId && !webClientId) {
    return 'Connexion Google non configurée pour iOS.'
  }
  return null
}

export function useGoogleSignIn(onSuccess: (idToken: string) => Promise<void>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configError = useMemo(() => getMissingGoogleConfigMessage(), [])
  const googleEnabled = !configError

  // Toujours appeler le hook (règles React), avec un client factice si non configuré.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId || '',
    iosClientId: iosClientId || webClientId || '',
    androidClientId:
      androidClientId || webClientId || '',
  })

  useEffect(() => {
    if (!googleEnabled || !response) return

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
  }, [response, onSuccess, googleEnabled])

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
    disabled: !googleEnabled || !request,
  }
}
