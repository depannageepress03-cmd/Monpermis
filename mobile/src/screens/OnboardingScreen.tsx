import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ArrowRight, BookOpen, Car, Smartphone } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/tokens'
import { markOnboardingDone } from '../utils/onboarding'
import { AppButton, Chip, LogoTile } from '../components/ui-kit-core'
import { RouteMotif } from '../components/ui-kit-cards'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>()

  const finish = async () => {
    await markOnboardingDone()
    navigation.replace('Login')
  }

  return (
    <View style={styles.root}>
      <View style={styles.haloGreen} pointerEvents="none" />
      <View style={styles.haloYellow} pointerEvents="none" />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.center}>
            <LogoTile size="lg" />
            <Text style={styles.brand}>
              Monpermis<Text style={styles.brandTld}>.bj</Text>
            </Text>
            <Text style={styles.tagline}>Le code et la conduite, au même endroit.</Text>
            <View style={styles.chips}>
              <Chip variant="green" small>
                <View style={styles.chipInner}>
                  <BookOpen size={15} color={colors.greenDark} strokeWidth={2.2} />
                  <Text style={styles.chipGreen}>QCM & examens blancs</Text>
                </View>
              </Chip>
              <Chip variant="yellow" small>
                <View style={styles.chipInner}>
                  <Car size={15} color={colors.yellowInk} strokeWidth={2.2} />
                  <Text style={styles.chipYellow}>Leçons de conduite</Text>
                </View>
              </Chip>
              <Chip variant="navy" small>
                <View style={styles.chipInner}>
                  <Smartphone size={15} color={colors.navy} strokeWidth={2.2} />
                  <Text style={styles.chipNavy}>Mobile Money</Text>
                </View>
              </Chip>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <LinearGradient colors={['#16306A', '#0A1B3D', '#06122A']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.sheet}>
        <RouteMotif />
        <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="Progression de l'introduction">
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.sheetTitle}>Ton permis,{'\n'}étape par étape.</Text>
        <Text style={styles.sheetText}>
          Révise le code, passe des examens blancs et réserve tes heures de conduite avec ton moniteur.
        </Text>
        <AppButton
          variant="slider"
          title="Commencer"
          onPress={() => void finish()}
          right={
            <View style={styles.knob}>
              <ArrowRight size={20} color={colors.yellow} strokeWidth={2.2} />
            </View>
          }
        />
        <Text style={styles.signin}>
          Déjà inscrit ?{' '}
          <Text style={styles.signinLink} onPress={() => void finish()}>
            Se connecter
          </Text>
        </Text>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  haloGreen: {
    position: 'absolute',
    top: -90,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.green,
    opacity: 0.14,
  },
  haloYellow: {
    position: 'absolute',
    top: 40,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.yellow,
    opacity: 0.16,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 72,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 6,
  },
  brand: {
    marginTop: 22,
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 32,
    letterSpacing: -0.96,
    color: colors.navy,
  },
  brandTld: {
    color: colors.green,
  },
  tagline: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    color: colors.muted,
  },
  chips: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipGreen: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.greenDark,
  },
  chipYellow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.yellowInk,
  },
  chipNavy: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.navy,
  },
  sheet: {
    height: 336,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 34,
    gap: 14,
    overflow: 'hidden',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.yellow,
  },
  sheetTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  sheetText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.78)',
  },
  knob: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signin: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  signinLink: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
  },
});
