import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
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
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { LegalFooter } from '../components/LegalFooter'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, gradients } from '../theme'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateName,
  validatePhone,
} from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  terms?: string
}

export function RegisterScreen() {
  const navigation = useNavigation<Nav>()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
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

  const handleContinue = () => {
    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
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
      phone: normalizePhone(phone),
    })
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
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
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
              <Text style={styles.title}>Crée ton compte</Text>
              <Text style={styles.subtitle}>
                Quelques infos et tu démarres ta préparation au permis.
              </Text>

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
  heroCopy: {
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 48,
    marginBottom: 10,
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
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
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
})
