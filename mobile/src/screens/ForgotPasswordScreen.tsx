import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MessageCircle } from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthLogoBadge } from '../components/AuthLogoBadge'
import { LegalFooter } from '../components/LegalFooter'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { supportWhatsAppUrl } from '../utils/support'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const whatsappHref = supportWhatsAppUrl(
    'Bonjour Monpermis, j’ai oublié mon code de connexion. Mon numéro : ',
  )

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
              <AuthLogoBadge size={72} style={styles.logoBadge} />
              <BrandName size={22} style={styles.brand} mainColor={dark.textPrimary} />
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                La connexion se fait avec ton numéro de téléphone et ton code. Pour réinitialiser
                ton code, contacte le support Monpermis via WhatsApp en indiquant ton numéro.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]}
              onPress={() => void Linking.openURL(whatsappHref)}
            >
              <MessageCircle size={18} color="#0B0F1A" />
              <Text style={styles.whatsappBtnText}>Contacter le support WhatsApp</Text>
            </Pressable>

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
  logoBadge: { marginBottom: 14 },
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
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  whatsappBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
  pressed: { opacity: 0.85 },
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
