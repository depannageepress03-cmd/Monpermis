import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loginUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { LegalFooter } from '../components/LegalFooter'
import { AuthLogoBadge } from '../components/AuthLogoBadge'
import { BrandName } from '../components/BrandName'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, gradients } from '../theme'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validatePhone,
  validatePassword,
} from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>
type Route = RouteProp<RootStackParamList, 'Login'>

export function LoginScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { signIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ phone?: string; password?: string; info?: string }>({})
  const [loading, setLoading] = useState(false)
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslate = useRef(new Animated.Value(16)).current

  useEffect(() => {
    setStatusBarStyle('light')
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
    return () => setStatusBarStyle('dark')
  }, [contentOpacity, contentTranslate])

  useEffect(() => {
    const message = route.params?.message?.trim()
    if (message) {
      setErrors((prev) => ({ ...prev, info: message }))
      navigation.setParams({ message: undefined })
    }
  }, [route.params?.message, navigation])

  const finishAuth = useCallback(
    async (token: string, user: Awaited<ReturnType<typeof loginUser>>['user']) => {
      await signIn(token, user)
      if (!String(user.phone || '').trim()) {
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
        Alert.alert(
          'Téléphone requis',
          'Ajoute ton numéro pour payer en Mobile Money et recevoir les rappels.',
        )
        return
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    },
    [navigation, signIn],
  )

  const handleSubmit = async () => {
    const phoneError = validatePhone(phone)
    const passwordError = validatePassword(password)

    if (phoneError || passwordError) {
      setErrors({ phone: phoneError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({
        identifier: normalizePhone(phone),
        password,
      })
      await finishAuth(token, user)
    } catch (error) {
      showAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/home/i2.jpg')}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <LinearGradient
          colors={['rgba(0,16,48,0.55)', 'rgba(0,16,48,0.82)', brand.navy]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <Animated.View
            style={[
              styles.heroCopy,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslate }],
              },
            ]}
          >
            <AuthLogoBadge size={92} style={styles.logoBadge} />
            <BrandName size={34} mainColor="#ffffff" style={styles.brand} />
            <Text style={styles.tagline}>Code, conduite, confiance — avance à ton rythme.</Text>
          </Animated.View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.panel}>
        <SafeAreaView style={styles.panelSafe} edges={['bottom']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.kicker}>Connexion</Text>
              <Text style={styles.title}>Content de te revoir</Text>
              <Text style={styles.subtitle}>
                Connecte-toi pour reprendre ta préparation au permis.
              </Text>

              {errors.info ? <Text style={styles.info}>{errors.info}</Text> : null}

              <View style={styles.fields}>
                <AuthInput
                  label="Téléphone"
                  placeholder={PHONE_PLACEHOLDER}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={phone}
                  onChangeText={(value) => setPhone(normalizePhone(value))}
                  error={errors.phone}
                />
                <AuthInput
                  label="Mot de passe"
                  placeholder="Ton mot de passe"
                  secureTextEntry
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />
                <Text style={styles.forgotWrap}>
                  <Text
                    style={styles.link}
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    Mot de passe oublié ?
                  </Text>
                </Text>
              </View>

              <Bouncy
                onPress={handleSubmit}
                disabled={loading}
                scaleTo={0.97}
                style={loading ? styles.disabled : undefined}
              >
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

              <Text style={styles.footer}>
                Pas encore de compte ?{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                  Créer un compte
                </Text>
              </Text>
              <LegalFooter />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.navy,
  },
  hero: {
    minHeight: 240,
    justifyContent: 'flex-end',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroSafe: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  heroCopy: {
    alignItems: 'center',
  },
  logoBadge: {
    marginBottom: 14,
  },
  brand: {
    marginBottom: 10,
  },
  tagline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 300,
  },
  panel: {
    flex: 1,
    marginTop: -18,
    backgroundColor: '#F4F7FB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  panelSafe: {
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
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: dark.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    marginBottom: 20,
    maxWidth: 320,
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
    marginBottom: 12,
  },
  forgotWrap: {
    marginTop: -8,
    textAlign: 'right',
  },
  submitBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: dark.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },
  submitText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 28,
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
  disabled: {
    opacity: 0.6,
  },
})
