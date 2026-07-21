import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { verifyEmail } from '../api/auth'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'VerifyEmail'>
type Route = RouteProp<RootStackParamList, 'VerifyEmail'>

export function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const token = route.params?.token || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')

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
})
