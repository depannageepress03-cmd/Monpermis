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
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

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
              <Text style={styles.title}>Code oublié</Text>
              <Text style={styles.subtitle}>
                La connexion se fait avec ton numéro de téléphone et ton code. Pour réinitialiser
                ton code, contacte le support Monpermis (WhatsApp ou message) en indiquant ton
                numéro de téléphone.
              </Text>
            </View>

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
    maxWidth: 320,
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
