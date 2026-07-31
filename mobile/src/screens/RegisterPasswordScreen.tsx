import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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
import { AuthLogoBadge } from '../components/AuthLogoBadge'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, gradients } from '../theme'
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
  const { firstName, lastName, phone } = route.params

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
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

  const handleSubmit = async () => {
    const passwordError = validatePassword(password)
    const confirmPasswordError = !confirmPassword
      ? 'Confirme ton mot de passe'
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
      const { message } = await registerUser({
        firstName,
        lastName,
        phone,
        password,
      })
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: {
              message:
                message || 'Compte créé. Connecte-toi avec ton téléphone et ton mot de passe.',
            },
          },
        ],
      })
    } catch (error) {
      showAuthError(error, 'Inscription impossible')
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
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityLabel="Retour"
          >
            <ChevronLeft size={22} color="#ffffff" />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <Animated.View
            style={[
              styles.heroCopy,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslate }],
              },
            ]}
          >
            <AuthLogoBadge size={72} style={styles.logoBadge} />
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
              <Text style={styles.kicker}>Inscription</Text>
              <Text style={styles.title}>Mot de passe</Text>
              <Text style={styles.subtitle}>
                Choisis un mot de passe pour finaliser ton inscription.
              </Text>

              <View style={styles.fields}>
                <AuthInput
                  label="Mot de passe"
                  placeholder="Ton mot de passe"
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

              <Text style={styles.hint}>
                Min. 8 caractères, avec majuscule, minuscule et chiffre.
              </Text>

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
                    {loading ? 'Inscription en cours…' : "S'inscrire"}
                  </Text>
                </LinearGradient>
              </Bouncy>
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
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroSafe: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginBottom: 10,
    marginLeft: -6,
    paddingVertical: 4,
  },
  backText: {
    color: '#ffffff',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
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
  fields: {
    gap: 18,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 20,
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
  disabled: {
    opacity: 0.6,
  },
})
