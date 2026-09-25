import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { setStatusBarStyle } from 'expo-status-bar'
import { Check, ChevronLeft, Eye, EyeOff, LockKeyhole, Mail, Phone } from 'lucide-react-native'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loginUser, type AuthUser } from '../api/auth'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { colors, textStyles } from '../theme/tokens'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateEmail,
  validatePhone,
  validatePassword,
} from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'
import { AppButton, AppTextField, IconButton, LogoTile, SegmentedControl } from '../components/ui-kit-core'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>
type Route = RouteProp<RootStackParamList, 'Login'>
type Mode = 'email' | 'phone'

export function LoginScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; info?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslate = useRef(new Animated.Value(16)).current

  useEffect(() => {
    setStatusBarStyle('dark')
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()
    return () => setStatusBarStyle('dark')
  }, [contentOpacity, contentTranslate])

  useEffect(() => {
    const message = route.params?.message?.trim()
    if (message) {
      setErrors((prev) => ({ ...prev, info: message }))
      navigation.setParams({ message: undefined })
    }
  }, [route.params?.message, navigation])

  // Case « Rester connecté 7 jours » (maquette) : la session mobile est
  // toujours persistée (SecureStore) et le JWT dure 7 j côté serveur.
  const finishAuth = useCallback(
    async (token: string, user: Awaited<ReturnType<typeof loginUser>>['user']) => {
      await signIn(token, user)
      if (!String(user.phone || '').trim()) {
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
        return
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    },
    [navigation, signIn],
  )

  const handleSubmit = async () => {
    const identifierError = mode === 'email' ? validateEmail(identifier) : validatePhone(identifier)
    const passwordError = validatePassword(password)

    if (identifierError || passwordError) {
      setErrors({ identifier: identifierError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({
        identifier: mode === 'email' ? identifier.trim() : normalizePhone(identifier),
        password,
      })
      await finishAuth(token, user)
    } catch (error) {
      showAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (user: AuthUser, token: string) => {
    await finishAuth(token, user)
  }

  const switchMode = (value: string) => {
    setMode(value as Mode)
    setIdentifier('')
    setErrors((prev) => ({ ...prev, identifier: undefined, form: undefined }))
  }

  return (
    <View style={styles.root}>
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }}>
              <View style={styles.topRow}>
                <IconButton
                  accessibilityLabel="Retour"
                  onPress={() => navigation.goBack()}
                >
                  <ChevronLeft size={20} color={colors.navy} strokeWidth={2.2} />
                </IconButton>
                <LogoTile />
              </View>

              <View style={styles.heading}>
                <Text style={styles.title}>Content de te revoir</Text>
                <Text style={styles.subtitle}>Connecte-toi pour reprendre ta préparation.</Text>
              </View>

              <SegmentedControl
                options={[
                  { value: 'email', label: 'E-mail' },
                  { value: 'phone', label: 'Téléphone' },
                ]}
                value={mode}
                onChange={switchMode}
              />

              <View style={styles.fields}>
                {errors.info ? <Text style={styles.info}>{errors.info}</Text> : null}
                {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
                {mode === 'phone' ? (
                  <AppTextField
                    label="Téléphone"
                    placeholder={PHONE_PLACEHOLDER}
                    keyboardType="phone-pad"
                    value={identifier}
                    onChangeText={(value) => {
                      setIdentifier(normalizePhone(value))
                      if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }))
                    }}
                    error={errors.identifier}
                    prefix={
                      <View style={styles.prefix}>
                        <Text style={styles.prefixText}>+229</Text>
                      </View>
                    }
                    left={<Phone size={20} color={colors.greenDark} strokeWidth={2} />}
                  />
                ) : (
                  <AppTextField
                    label="Adresse e-mail"
                    placeholder="aicha@exemple.bj"
                    keyboardType="email-address"
                    value={identifier}
                    onChangeText={(value) => {
                      setIdentifier(value)
                      if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }))
                    }}
                    error={errors.identifier}
                    left={<Mail size={20} color={colors.greenDark} strokeWidth={2} />}
                  />
                )}
                <AppTextField
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  error={errors.password}
                  left={<LockKeyhole size={20} color={colors.muted} strokeWidth={2} />}
                  right={
                    showPassword ? (
                      <EyeOff size={20} color={colors.muted} strokeWidth={2} />
                    ) : (
                      <Eye size={20} color={colors.muted} strokeWidth={2} />
                    )
                  }
                  onRightPress={() => setShowPassword((value) => !value)}
                  rightAccessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                />
                <View style={styles.rememberRow}>
                  <Pressable
                    onPress={() => setRemember((value) => !value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: remember }}
                    accessibilityLabel="Rester connecté 7 jours"
                    style={styles.remember}
                  >
                    <View style={[styles.box, remember && styles.boxOn]}>
                      {remember ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                    </View>
                    <Text style={styles.rememberText}>Rester connecté 7 jours</Text>
                  </Pressable>
                  <Text style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
                    Mot de passe oublié ?
                  </Text>
                </View>
              </View>

              <AppButton variant="primary" title={loading ? 'Connexion…' : 'Se connecter'} onPress={handleSubmit} disabled={loading} />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleAuthButton
                label="Continuer avec Google"
                onSuccess={handleGoogleSuccess}
                onError={(message) => setErrors({ form: message })}
              />

              <Text style={styles.footer}>
                Pas encore de compte ?{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                  Créer un compte
                </Text>
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  halo: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.green,
    opacity: 0.12,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 28,
    gap: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    gap: 6,
    marginTop: 6,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14.5,
    color: colors.muted,
  },
  fields: {
    gap: 14,
  },
  info: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.greenInk,
    backgroundColor: colors.greenTint,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  formError: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.wrongInk,
    backgroundColor: colors.wrongBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  prefix: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.fieldPrefix,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  rememberText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.ink2,
  },
  forgot: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.greenDark,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.subtle,
  },
  footer: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: colors.muted,
  },
  link: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: colors.greenDark,
  },
});
