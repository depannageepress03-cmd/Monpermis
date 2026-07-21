import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loginUser, loginWithGoogle } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { LegalFooter } from '../components/LegalFooter'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { BrandName } from '../components/BrandName'
import { useAuth } from '../context/AuthContext'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'
import { validateEmail, validatePassword } from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>
type Route = RouteProp<RootStackParamList, 'Login'>

export function LoginScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; info?: string }>({})
  const [loading, setLoading] = useState(false)
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslate = useRef(new Animated.Value(12)).current

  useEffect(() => {
    setStatusBarStyle('dark')
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start()
  }, [contentOpacity, contentTranslate])

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      try {
        const { user, token } = await loginWithGoogle(idToken)
        await signIn(token, user)
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
      } catch (error) {
        showAuthError(error)
      }
    },
    [navigation, signIn],
  )

  const {
    signInWithGoogle,
    loading: googleLoading,
    disabled: googleDisabled,
    error: googleError,
  } = useGoogleSignIn(handleGoogleSuccess)

  useEffect(() => {
    if (googleError) {
      showAuthError(new Error(googleError))
    }
  }, [googleError])

  useEffect(() => {
    if (route.params?.message) {
      setErrors((prev) => ({ ...prev, info: route.params?.message }))
      navigation.setParams({ message: undefined })
    }
  }, [route.params?.message, navigation])

  const handleSubmit = async () => {
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({ email, password })
      await signIn(token, user)
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (error) {
      showAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <Animated.View
            style={[
              styles.flex,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslate }],
              },
            ]}
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
                <Text style={styles.title}>Content de te revoir</Text>
                <Text style={styles.subtitle}>
                  Connecte-toi pour reprendre ta préparation au permis.
                </Text>
              </View>

              {errors.info ? <Text style={styles.info}>{errors.info}</Text> : null}

              <View style={styles.fields}>
                <AuthInput
                  label="Adresse email"
                  placeholder="Adresse email"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                />
                <AuthInput
                  label="Mot de passe"
                  placeholder="Mot de passe"
                  secureTextEntry
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />
              </View>

              <Pressable style={styles.forgotHit} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgot}>Mot de passe oublié ?</Text>
              </Pressable>

              <Bouncy onPress={handleSubmit} disabled={loading} scaleTo={0.97} style={loading && styles.disabled}>
                <LinearGradient
                  colors={gradients.green}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitText}>
                    {loading ? 'Connexion en cours…' : 'Se connecter'}
                  </Text>
                </LinearGradient>
              </Bouncy>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton
                onPress={signInWithGoogle}
                loading={googleLoading}
                disabled={googleDisabled || loading}
              />

              <Text style={styles.footer}>
                Pas encore de compte ?{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                  Créer un compte
                </Text>
              </Text>
            <LegalFooter />
            </ScrollView>
          </Animated.View>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  info: {
    color: dark.green,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: dark.greenSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  fields: {
    gap: 18,
  },
  forgotHit: {
    alignSelf: 'center',
    paddingVertical: 16,
  },
  forgot: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: dark.textMuted,
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
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: dark.border,
  },
  dividerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: dark.textMuted,
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
  },
  link: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
})
