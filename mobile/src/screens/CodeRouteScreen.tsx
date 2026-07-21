import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HelpCircle,
  List,
  Lock,
} from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { Bouncy } from '../components/Bouncy'
import { FadeUp } from '../components/FadeUp'
import { LegalFooter } from '../components/LegalFooter'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeRoute'>
type Tone = 'green' | 'coral' | 'neutral'

const categories = [
  {
    id: 'RevisionChapitres' as const,
    label: 'Révision par chapitres',
    subtitle: 'Signalisation, priorités, sécurité…',
    icon: List,
    tone: 'green' as Tone,
  },
  {
    id: 'ExamensTest' as const,
    label: 'Examens test',
    subtitle: 'Auto-évaluation guidée, note sur 20',
    icon: HelpCircle,
    tone: 'coral' as Tone,
  },
  {
    id: 'MesNotes' as const,
    label: 'Mes notes & avancée',
    subtitle: 'Où tu en es et tes résultats',
    icon: FileText,
    tone: 'neutral' as Tone,
  },
  {
    id: 'ECodePermis' as const,
    label: 'E-Codepermis',
    subtitle: 'Examen blanc en conditions réelles',
    icon: ClipboardCheck,
    tone: 'green' as Tone,
  },
]

const toneMap: Record<Tone, { accent: string; soft: string; border: string }> = {
  green: { accent: dark.green, soft: dark.greenSoft, border: 'rgba(34,214,115,0.28)' },
  coral: { accent: dark.coral, soft: dark.coralSoft, border: 'rgba(255,107,74,0.28)' },
  neutral: { accent: dark.textPrimary, soft: dark.surfaceRaised, border: dark.border },
}

export function CodeRouteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [user])

  if (loading || !user) return <ScreenLoader />

  const header = (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Retour"
        hitSlop={10}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <Text style={styles.topBarTitle}>Code de la route</Text>
      <View style={styles.backBtn} />
    </View>
  )

  if (subscriptionLoading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <View style={styles.accessState}>
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!subscription?.accessCode) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <View style={styles.accessState}>
            <View style={styles.accessLock}>
              <Lock size={30} color={dark.textMuted} />
            </View>
            <Text style={styles.accessStateTitle}>Module Code verrouillé</Text>
            <Text style={styles.accessStateCopy}>
              Ton abonnement doit inclure l’accès au Code de la route.
            </Text>
            <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('Abonnement')}>
              <View style={styles.accessButton}>
                <Text style={styles.accessButtonText}>Voir les offres</Text>
              </View>
            </Bouncy>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp delay={80} style={styles.hero}>
            <Text style={styles.heroEyebrow}>4 modules</Text>
            <Text style={styles.heroTitle}>Prépare ton code</Text>
            <Text style={styles.heroSubtitle}>
              Révise chapitre par chapitre, teste-toi, suis ta progression, puis passe l’examen
              blanc en conditions réelles.
            </Text>
          </FadeUp>

          <View style={styles.list}>
            {categories.map((category, index) => {
              const Icon = category.icon
              const tone = toneMap[category.tone]

              return (
                <FadeUp key={category.id} delay={200 + index * 80}>
                  <Bouncy
                    scaleTo={0.97}
                    onPress={() => navigation.navigate(category.id)}
                  >
                    <View style={[styles.card, { borderColor: tone.border }]}>
                      <View style={styles.cardIndex}>
                        <Text style={styles.cardIndexText}>{index + 1}</Text>
                      </View>
                      <View style={[styles.iconWrap, { backgroundColor: tone.soft }]}>
                        <Icon size={22} color={tone.accent} />
                      </View>
                      <View style={styles.cardCopy}>
                        <Text style={styles.cardTitle}>{category.label}</Text>
                        <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
                      </View>
                      <ChevronRight size={20} color={tone.accent} />
                    </View>
                  </Bouncy>
                </FadeUp>
              )
            })}
          </View>

          <LegalFooter />
        </ScrollView>
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

  /* Header */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },

  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },

  /* Hero */
  hero: {
    marginBottom: 22,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 30,
    lineHeight: 36,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: dark.textMuted,
  },

  /* Hint */
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: dark.coralSoft,
    marginBottom: 18,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: dark.textPrimary,
  },

  /* Module list */
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    backgroundColor: dark.surface,
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardIndex: {
    width: 22,
    alignItems: 'center',
  },
  cardIndexText: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: dark.textMuted,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: dark.textMuted,
  },

  /* Access state */
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  accessLock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    marginBottom: 16,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
  },
  accessButton: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  accessButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#0B0F1A',
  },
  pressed: {
    opacity: 0.85,
  },
})
