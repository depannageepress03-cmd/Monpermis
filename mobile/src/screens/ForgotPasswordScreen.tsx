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
import { dark, fonts, gradients } from '../theme'
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
              <BrandName size={22} style={styles.brand} mainColor={dark.textPrimary} />
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Saisis ton email, on t’envoie un lien pour réinitialiser ton mot de passe.
              </Text>
            </View>

            {sent ? (
              <View style={styles.sentCard}>
                <Text style={styles.sentTitle}>Email envoyé</Text>
                <Text style={styles.sentCopy}>
                  Si un compte existe avec cette adresse, tu recevras un lien de
                  réinitialisation sous quelques minutes. Ouvre-le depuis ton téléphone
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
  root: { flex: 1, backgroundColor: dark.bg },
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
  logo: { width: 110, height: 74, marginBottom: 12 },
  brand: { marginBottom: 16 },
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
    shadowColor: dark.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#0B0F1A' },
  disabled: { opacity: 0.6 },
  footer: {
    marginTop: 24,
    textAlign: 'center',
  },
  link: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  sentCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  sentTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.green,
    textAlign: 'center',
  },
  sentCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
})
