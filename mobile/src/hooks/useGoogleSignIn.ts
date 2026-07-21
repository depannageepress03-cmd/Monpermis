import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { getGoogleClientIds, getGoogleConfigError } from '../config/google'

let configured = false

function ensureGoogleConfigured() {
  if (configured) return
  const { web, ios } = getGoogleClientIds()
  GoogleSignin.configure({
    webClientId: web,
    iosClientId: Platform.OS === 'ios' ? ios || web : undefined,
    offlineAccess: false,
  })
  configured = true
}

function mapGoogleError(error: unknown): string {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'Connexion Google annulée'
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return 'Connexion Google déjà en cours'
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services indisponible sur cet appareil'
    }
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Connexion Google échouée'
}

export function useGoogleSignIn(onSuccess: (idToken: string) => Promise<void>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configError = useMemo(() => getGoogleConfigError(), [])
  const googleEnabled = !configError

  useEffect(() => {
    if (!googleEnabled) return
    try {
      ensureGoogleConfigured()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration Google impossible')
    }
  }, [googleEnabled])

  const signInWithGoogle = useCallback(async () => {
    if (configError) {
      setError(configError)
      return
    }

    setError(null)
    setLoading(true)

    try {
      ensureGoogleConfigured()
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      }

      const response = await GoogleSignin.signIn()
      if (!isSuccessResponse(response)) {
        setError('Connexion Google annulée')
        return
      }

      const idToken = response.data.idToken
      if (!idToken) {
        setError('Token Google manquant. Vérifiez le client Web OAuth dans Google Cloud.')
        return
      }

      await onSuccess(idToken)
    } catch (err) {
      setError(mapGoogleError(err))
    } finally {
      setLoading(false)
    }
  }, [configError, onSuccess])

  return {
    signInWithGoogle,
    loading,
    error,
    disabled: !googleEnabled,
  }
}
