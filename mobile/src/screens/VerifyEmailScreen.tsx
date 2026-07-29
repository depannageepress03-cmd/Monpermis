import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { resendVerificationEmail, verifyEmail } from '../api/auth'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { validateEmail } from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'VerifyEmail'>
type Route = RouteProp<RootStackParamList, 'VerifyEmail'>

export function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const token = route.params?.token || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Lien invalide ou expiré.')
      return
    }
    let cancelled = false
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('ok')
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error')
          setError(err instanceof Error ? err.message : 'Vérification impossible')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async () => {
    const emailError = validateEmail(resendEmail)
    if (emailError) {
      setResendMsg(emailError)
      return
    }
    setResending(true)
    setResendMsg('')
    try {
      await resendVerificationEmail(resendEmail.trim())
      setResendMsg('Si un compte non vérifié existe, un nouveau lien a été envoyé.')
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <BrandName size={22} style={styles.brand} mainColor={dark.textPrimary} />
          {status === 'loading' ? (
            <Text style={styles.muted}>Vérification en cours…</Text>
          ) : null}
          {status === 'ok' ? (
            <>
              <Text style={styles.ok}>Email vérifié avec succès !</Text>
              <Pressable onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
                <Text style={styles.link}>Se connecter</Text>
              </Pressable>
            </>
          ) : null}
          {status === 'error' ? (
            <>
              <Text style={styles.err}>{error}</Text>
              <Text style={styles.muted}>
                Lien expiré ? Renseigne ton email pour recevoir un nouveau lien.
              </Text>
              <TextInput
                style={styles.input}
                value={resendEmail}
                onChangeText={setResendEmail}
                placeholder="Adresse email"
                placeholderTextColor={dark.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {resendMsg ? <Text style={styles.ok}>{resendMsg}</Text> : null}
              <Pressable onPress={() => void handleResend()} disabled={resending}>
                <Text style={styles.link}>{resending ? 'Envoi…' : 'Renvoyer le lien'}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Retour à la connexion</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  safe: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { alignItems: 'center', gap: 14 },
  brand: { marginBottom: 8 },
  muted: { fontFamily: fonts.body, fontSize: 15, color: dark.textMuted, textAlign: 'center' },
  ok: { fontFamily: fonts.bodyBold, fontSize: 16, color: dark.green, textAlign: 'center' },
  err: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#ef4444', textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: dark.green, marginTop: 8 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a3344',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
  },
})
