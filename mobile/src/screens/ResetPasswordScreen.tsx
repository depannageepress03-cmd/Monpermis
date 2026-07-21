import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { resetPassword } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { BrandName } from '../components/BrandName'
import { LegalFooter } from '../components/LegalFooter'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>
type Route = RouteProp<RootStackParamList, 'ResetPassword'>

export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const token = route.params?.token || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!token) {
      setError('Lien invalide ou expiré')
      return
    }
    if (password.length < 8) {
      setError('Minimum 8 caractères')
      return
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Majuscule, minuscule et chiffre requis')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Text style={styles.err}>Lien invalide ou expiré.</Text>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Demander un nouveau lien</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BrandName size={22} style={styles.brand} mainColor={dark.textPrimary} />
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>Choisis un mot de passe sécurisé.</Text>

            {done ? (
              <View style={styles.center}>
                <Text style={styles.ok}>Mot de passe réinitialisé !</Text>
                <Pressable onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
                  <Text style={styles.link}>Se connecter</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.fields}>
                  <AuthInput
                    label="Nouveau mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    error={error}
                  />
                  <AuthInput
                    label="Confirmer"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
                <Bouncy onPress={handleSubmit} disabled={loading} scaleTo={0.97}>
                  <LinearGradient
                    colors={gradients.green}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitText}>
                      {loading ? 'Réinitialisation…' : 'Réinitialiser'}
                    </Text>
                  </LinearGradient>
                </Bouncy>
              </>
            )}
            <LegalFooter />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  brand: { alignSelf: 'center', marginBottom: 16 },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  fields: { gap: 16, marginBottom: 20 },
  submitBtn: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#0B0F1A' },
  center: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  ok: { fontFamily: fonts.bodyBold, fontSize: 16, color: dark.green, textAlign: 'center' },
  err: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#ef4444', textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
})
