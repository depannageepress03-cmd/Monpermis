import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { getGoogleAuthConfig, loginWithGoogle, type AuthUser, type GoogleAuthConfig } from '../api/auth'
import { dark, fonts, shadows } from '../theme'

WebBrowser.maybeCompleteAuthSession()

interface GoogleAuthButtonProps {
  label?: string
  onSuccess: (user: AuthUser, token: string) => void
  onError: (message: string) => void
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  )
}

/**
 * Bouton « Continuer avec Google » (expo-auth-session).
 * Récupère la config Google depuis le serveur puis ouvre le sélecteur de compte.
 * Masqué si Google n'est pas configuré.
 */
export function GoogleAuthButton({ label = 'Continuer avec Google', onSuccess, onError }: GoogleAuthButtonProps) {
  const [config, setConfig] = useState<GoogleAuthConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: config?.clientId || config?.androidClientId || config?.iosClientId || '',
    iosClientId: config?.iosClientId,
    androidClientId: config?.androidClientId,
  })

  useEffect(() => {
    let cancelled = false
    getGoogleAuthConfig()
      .then((next) => {
        if (!cancelled) setConfig(next)
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false, clientId: '', androidClientId: '', iosClientId: '' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handlePress = async () => {
    if (submitting || loading || !config?.enabled) return
    if (!request) {
      onError('Connexion Google pas encore prête. Réessaie dans un instant.')
      return
    }
    setSubmitting(true)
    try {
      const result = await promptAsync()
      if (result.type !== 'success' || !result.params?.id_token) return
      const { user, token } = await loginWithGoogle(result.params.id_token)
      onSuccess(user, token)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Connexion Google impossible')
    } finally {
      setSubmitting(false)
    }
  }

  if (!config?.enabled || loading) return null

  return (
    <Pressable
      onPress={handlePress}
      disabled={submitting}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        submitting && styles.disabled,
      ]}
      accessibilityRole="button"
    >
      {submitting ? (
        <ActivityIndicator size="small" color={dark.textPrimary} />
      ) : (
        <GoogleLogo />
      )}
      <Text style={styles.label}>{submitting ? 'Connexion…' : label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
})
