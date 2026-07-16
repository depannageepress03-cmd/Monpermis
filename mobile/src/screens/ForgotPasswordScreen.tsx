import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Mail } from 'lucide-react-native'
import { useState } from 'react'
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
import { forgotPassword } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { brand, colors, gradients, typography } from '../theme'
import { validateEmail } from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch {
      // On ne révèle jamais si l'email existe ou non
      setSent(true)
    } finally {
      setLoading(false)
    }
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
            <View style={styles.header}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <BrandName size={22} style={styles.brand} />
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Saisissez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </Text>
            </View>

            {sent ? (
              <View style={styles.sentCard}>
                <Text style={styles.sentTitle}>Email envoyé !</Text>
                <Text style={styles.sentCopy}>
                  Si un compte existe avec cette adresse, vous recevrez un lien de
                  réinitialisation sous quelques minutes. Ouvrez-le depuis votre téléphone
                  pour choisir un nouveau mot de passe.
                </Text>
                <Pressable onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.link}>Retour à la connexion</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.fields}>
                  <AuthInput
                    label="Adresse email"
                    placeholder="Adresse email"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    error={error}
                  />
                </View>

                <Bouncy onPress={handleSubmit} disabled={loading} scaleTo={0.97} style={loading && styles.disabled}>
                  <LinearGradient
                    colors={gradients.green}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitText}>
                      {loading ? 'Envoi…' : 'Envoyer le lien'}
                    </Text>
                  </LinearGradient>
                </Bouncy>

                <Text style={styles.footer}>
                  <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                    Retour à la connexion
                  </Text>
                </Text>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.introBg },
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  logo: { width: 120, height: 80, marginBottom: 12 },
  brand: { marginBottom: 16 },
  title: {
    ...typography.h2,
    color: brand.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  fields: { gap: 18, marginBottom: 24 },
  submitBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: brand.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  submitText: { ...typography.button, color: colors.white },
  disabled: { opacity: 0.6 },
  footer: {
    marginTop: 24,
    textAlign: 'center',
  },
  link: {
    color: brand.navy,
    fontWeight: '700',
    ...typography.bodySmall,
    textDecorationLine: 'underline',
  },
  sentCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  sentTitle: {
    ...typography.h4,
    color: brand.green,
    textAlign: 'center',
  },
  sentCopy: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
})
