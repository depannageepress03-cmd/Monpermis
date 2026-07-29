import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
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
import { LegalFooter } from '../components/LegalFooter'
import { BrandName } from '../components/BrandName'
import { Bouncy } from '../components/Bouncy'
import { buildPasswordHelpWhatsAppUrl } from '../config/support'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { safeOpenUrl } from '../utils/safeOpenUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>()

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
                La connexion se fait avec ton numéro de téléphone et ton mot de passe. Pour le
                réinitialiser, contacte le support Monpermis sur WhatsApp en indiquant ton numéro.
              </Text>
            </View>

            <Bouncy
              onPress={() => void safeOpenUrl(buildPasswordHelpWhatsAppUrl())}
              scaleTo={0.97}
              style={styles.ctaWrap}
            >
              <View style={styles.ctaBtn}>
                <Text style={styles.ctaText}>Contacter le support WhatsApp</Text>
              </View>
            </Bouncy>

            <Text style={styles.footer}>
              <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                Retour à la connexion
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
    marginBottom: 28,
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
    maxWidth: 320,
  },
  ctaWrap: { marginBottom: 24 },
  ctaBtn: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
  footer: {
    marginTop: 8,
    textAlign: 'center',
  },
  link: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
})
