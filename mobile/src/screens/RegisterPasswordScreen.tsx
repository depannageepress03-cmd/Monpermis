import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { registerUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { LegalFooter } from '../components/LegalFooter'
import { BrandName } from '../components/BrandName'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'
import { validatePassword } from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegisterPassword'>
type Route = RouteProp<RootStackParamList, 'RegisterPassword'>

interface FormErrors {
  password?: string
  confirmPassword?: string
}

export function RegisterPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { signIn } = useAuth()
  const { firstName, lastName, email, phone } = route.params

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatusBarStyle('dark')
  }, [])

  const handleSubmit = async () => {
    const passwordError = validatePassword(password)
    const confirmPasswordError = !confirmPassword
      ? 'Confirmez votre mot de passe'
      : confirmPassword !== password
        ? 'Les mots de passe ne correspondent pas'
        : undefined

    if (passwordError || confirmPasswordError) {
      setErrors({ password: passwordError, confirmPassword: confirmPasswordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await registerUser({
        firstName,
        lastName,
        email,
        phone,
        password,
      })
      await signIn(token, user)
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (error) {
      showAuthError(error, 'Inscription impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={dark.textPrimary} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <BrandName size={22} style={styles.brand} mainColor={dark.textPrimary} />
              <Text style={styles.title}>Ton mot de passe</Text>
              <Text style={styles.subtitle}>
                Choisis un mot de passe sécurisé pour finaliser ton inscription.
              </Text>
            </View>

            <View style={styles.fields}>
              <AuthInput
                label="Mot de passe"
                placeholder="Mot de passe"
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              <AuthInput
                label="Confirmer le mot de passe"
                placeholder="Confirmer le mot de passe"
                secureTextEntry
                autoComplete="new-password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
              />
            </View>

            <Text style={styles.hint}>Minimum 8 caractères</Text>

            <Bouncy onPress={handleSubmit} disabled={loading} scaleTo={0.97} style={loading && styles.disabled}>
              <LinearGradient
                colors={gradients.green}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitText}>
                  {loading ? 'Inscription en cours…' : "S'inscrire"}
                </Text>
              </LinearGradient>
            </Bouncy>
          <LegalFooter />
            </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginLeft: 16,
    marginTop: 4,
    paddingVertical: 8,
  },
  backText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 110,
    height: 74,
    marginBottom: 12,
  },
  brand: {
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: dark.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  fields: {
    gap: 18,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 24,
    marginLeft: 2,
  },
  submitBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: dark.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  submitText: {
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
})
