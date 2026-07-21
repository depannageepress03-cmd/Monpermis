import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
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
import { loginWithGoogle } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { LegalFooter } from '../components/LegalFooter'
import { BrandName } from '../components/BrandName'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuth } from '../context/AuthContext'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateEmail,
  validateName,
  validatePhone,
} from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  terms?: string
}

export function RegisterScreen() {
  const navigation = useNavigation<Nav>()
  const { signIn } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setStatusBarStyle('dark')
  }, [])

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

  const handleGooglePress = () => {
    if (!acceptTerms) {
      setErrors({ terms: "Veuillez accepter les conditions d'utilisation" })
      return
    }
    void signInWithGoogle()
  }

  const handleContinue = () => {
    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      email: validateEmail(email),
      phone: validatePhone(phone),
      terms: !acceptTerms ? "Veuillez accepter les conditions d'utilisation" : undefined,
    }

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    navigation.navigate('RegisterPassword', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: normalizePhone(phone),
    })
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
              <Text style={styles.title}>Crée ton compte</Text>
              <Text style={styles.subtitle}>
                Quelques infos et tu démarres ta préparation au permis.
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <AuthInput
                  label="Prénom"
                  placeholder="Prénom"
                  autoComplete="name-given"
                  value={firstName}
                  onChangeText={setFirstName}
                  error={errors.firstName}
                />
              </View>
              <View style={styles.half}>
                <AuthInput
                  label="Nom"
                  placeholder="Nom"
                  autoComplete="name-family"
                  value={lastName}
                  onChangeText={setLastName}
                  error={errors.lastName}
                />
              </View>
            </View>

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
                label="Téléphone"
                placeholder={PHONE_PLACEHOLDER}
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(value) => setPhone(normalizePhone(value))}
                error={errors.phone}
              />
            </View>

            <View style={styles.checkboxRow}>
              <Pressable
                style={styles.checkboxHit}
                onPress={() => setAcceptTerms((prev) => !prev)}
                hitSlop={8}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]} />
              </Pressable>
              <Text style={styles.checkboxLabel}>
                J'accepte les{' '}
                <Text
                  style={styles.checkboxLink}
                  onPress={() => navigation.navigate('TermsOfUse')}
                >
                  conditions d'utilisation
                </Text>
              </Text>
            </View>
            {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

            <Bouncy onPress={handleContinue} scaleTo={0.97}>
              <LinearGradient
                colors={gradients.green}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitText}>Continuer</Text>
              </LinearGradient>
            </Bouncy>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton
              onPress={handleGooglePress}
              loading={googleLoading}
              disabled={googleDisabled}
            />

            <Text style={styles.footer}>
              Déjà inscrit ?{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                Se connecter
              </Text>
            </Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  half: {
    flex: 1,
  },
  fields: {
    gap: 18,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingVertical: 4,
  },
  checkboxHit: {
    paddingTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: dark.border,
    backgroundColor: dark.surface,
  },
  checkboxChecked: {
    backgroundColor: dark.green,
    borderColor: dark.green,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    lineHeight: 20,
  },
  checkboxLink: {
    color: dark.green,
    fontFamily: fonts.bodySemiBold,
  },
  termsError: {
    color: dark.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 12,
  },
  submitBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
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
    letterSpacing: 0.8,
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
  },
  pressed: {
    opacity: 0.9,
  },
})
