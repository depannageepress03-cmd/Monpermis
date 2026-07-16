import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import {
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
import { ContentError, fetchPracticeExams } from '../api/revision'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { FadeUp } from '../components/FadeUp'
import { Bouncy } from '../components/Bouncy'
import { AccentBar } from '../components/AccentBar'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, colors, gradients, typography } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeRoute'>

const categories = [
  {
    id: 'RevisionChapitres' as const,
    label: 'Révision par chapitres',
    subtitle: 'Signalisation, priorités, sécurité…',
    icon: List,
    tone: 'green' as const,
    requiresAllCourses: false,
  },
  {
    id: 'ExamensTest' as const,
    label: 'Examens test',
    subtitle: 'Auto-évaluation guidée',
    icon: HelpCircle,
    tone: 'gold' as const,
    requiresAllCourses: true,
  },
  {
    id: 'MesNotes' as const,
    label: 'Mes notes & avancée',
    subtitle: 'Où vous en êtes et vos notes',
    icon: FileText,
    tone: 'navy' as const,
    requiresAllCourses: false,
  },
  {
    id: 'ECodePermis' as const,
    label: 'E-Codepermis',
    subtitle: 'Examen blanc en conditions réelles',
    icon: ClipboardCheck,
    tone: 'green' as const,
    requiresAllCourses: false,
  },
]

export function CodeRouteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [examsUnlocked, setExamsUnlocked] = useState(false)
  const [unlockHint, setUnlockHint] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

  const loadUnlock = useCallback(async () => {
    try {
      const data = await fetchPracticeExams()
      setExamsUnlocked(data.unlocked !== false)
      setUnlockHint(
        data.unlocked === false
          ? data.message ||
              'Terminez tous les cours de chaque chapitre pour débloquer les examens test.'
          : null,
      )
    } catch (err) {
      setExamsUnlocked(true)
      setUnlockHint(err instanceof ContentError ? err.message : null)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [user])

  useEffect(() => {
    if (subscription?.accessCode) void loadUnlock()
  }, [subscription, loadUnlock])

  if (loading || !user) return <ScreenLoader />

  const lockedContent = subscriptionLoading ? (
    <View style={styles.accessState}>
      <Text style={styles.accessStateCopy}>Vérification de votre accès…</Text>
    </View>
  ) : !subscription?.accessCode ? (
    <View style={styles.accessState}>
      <View style={styles.accessLock}><Lock size={32} color={brand.navyMuted} /></View>
      <Text style={styles.accessStateTitle}>Le module Code est verrouillé</Text>
      <Text style={styles.accessStateCopy}>
        Votre abonnement doit inclure l’accès au Code de la route.
      </Text>
      <Pressable style={styles.accessButton} onPress={() => navigation.navigate('Abonnement')}>
        <Text style={styles.accessButtonText}>Voir les offres</Text>
      </Pressable>
    </View>
  ) : null

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <FadeUp delay={0}>
          <PageNavbar
            title="Code de la route"
            icon={CodeModuleIcon}
            onBack={() => navigation.navigate('Home')}
          />
        </FadeUp>

        {lockedContent ?? <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={120} style={styles.header}>
            <AccentBar delay={0} />
            <Text style={styles.subtitle}>
              Choisissez un module pour réviser, vous tester ou passer un examen blanc.
            </Text>
            <Text style={styles.detail}>
              Avancez à votre rythme : cours par chapitres, examens test, suivi de vos notes,
              puis un examen blanc en conditions réelles.
            </Text>
            {!examsUnlocked && unlockHint ? (
              <Text style={styles.lockHint}>{unlockHint}</Text>
            ) : null}
          </FadeUp>

          <View style={styles.grid}>
            {categories.map((category, index) => {
              const Icon = category.icon
              const toneStyles = toneMap[category.tone]
              const locked = category.requiresAllCourses && !examsUnlocked

              return (
                <FadeUp
                  key={category.id}
                  delay={280 + index * 90}
                  style={styles.cardWrap}
                >
                  <Bouncy
                    disabled={locked}
                    scaleTo={0.95}
                    onPress={() => {
                      if (!locked) navigation.navigate(category.id)
                    }}
                  >
                    <View style={[styles.card, toneStyles.card, locked && styles.cardLocked]}>
                      <LinearGradient
                        colors={locked ? ['#E5E9EF', '#D6DCE5'] : toneStyles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconWrap}
                      >
                        {locked ? (
                          <Lock size={20} color={brand.navyMuted} />
                        ) : (
                          <Icon size={22} color={colors.white} />
                        )}
                      </LinearGradient>
                      <Text style={styles.cardTitle}>{category.label}</Text>
                      <Text style={styles.cardSubtitle}>
                        {locked ? 'Terminez tous les cours' : category.subtitle}
                      </Text>
                    </View>
                  </Bouncy>
                </FadeUp>
              )
            })}
          </View>
        </ScrollView>}
      </SafeAreaView>
    </View>
  )
}

const toneMap = {
  green: {
    card: { backgroundColor: brand.greenLight, borderColor: `${brand.green}28` },
    gradient: gradients.green,
  },
  gold: {
    card: { backgroundColor: brand.goldLight, borderColor: `${brand.gold}55` },
    gradient: gradients.gold,
  },
  navy: {
    card: { backgroundColor: `${brand.navy}08`, borderColor: `${brand.navy}14` },
    gradient: gradients.navy,
  },
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  header: {
    marginTop: 8,
    marginBottom: 48,
  },
  subtitle: {
    ...typography.bodySmall,
    color: brand.navy,
    maxWidth: 360,
    marginBottom: 12,
  },
  detail: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    maxWidth: 360,
  },
  lockHint: {
    ...typography.caption,
    color: brand.navyMuted,
    marginTop: 12,
    maxWidth: 360,
  },
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
    backgroundColor: `${brand.navy}08`,
    marginBottom: 16,
  },
  accessStateTitle: {
    ...typography.h4,
    color: brand.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  accessButton: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: brand.green,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  accessButtonText: { ...typography.button, color: colors.white },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 40,
  },
  cardWrap: {
    width: '47.5%',
    flexGrow: 1,
    flexBasis: '47%',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    minHeight: 148,
  },
  cardLocked: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: brand.navy,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.caption,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
})
