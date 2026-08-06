import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LineChart,
  Lock,
  Pencil,
  ShieldCheck,
  Smartphone,
  Trophy,
  Wallet,
} from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  fetchAccessMe,
  fetchAccessModules,
  computeModuleAmount,
  type AccessMe,
  type AccessModule,
} from '../api/accessRequests'
import {
  fetchLearnerJourney,
  type LearnerJourney,
} from '../api/revision'
import { Bouncy } from '../components/Bouncy'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { FadeUp } from '../components/FadeUp'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { ScreenLoader } from '../components/ScreenLoader'
import { SkeletonList } from '../components/Skeleton'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { PAYMENT_OPERATORS } from '../utils/paymentOperators'
import { brand, dark, fonts, radii, shadows } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeRoute'>

type Tone = 'pink' | 'orange' | 'green' | 'navy'

type Category = {
  id: 'RevisionChapitres' | 'ExamensTest' | 'MesNotes' | 'CodeCours'
  label: string
  subtitle: string
  image: number
  tone: Tone
  Icon: typeof Pencil
}

const toneShade: Record<Tone, readonly [string, string, string]> = {
  pink: ['rgba(219,39,119,0.05)', 'rgba(219,39,119,0.35)', 'rgba(157,23,77,0.92)'],
  orange: ['rgba(234,88,12,0.05)', 'rgba(234,88,12,0.35)', 'rgba(154,52,18,0.92)'],
  green: ['rgba(0,176,80,0.05)', 'rgba(0,176,80,0.32)', 'rgba(0,100,40,0.92)'],
  navy: ['rgba(0,16,48,0.05)', 'rgba(0,16,48,0.38)', 'rgba(0,16,48,0.92)'],
}

const toneIconBg: Record<Tone, string> = {
  pink: 'rgba(219,39,119,0.92)',
  orange: 'rgba(234,88,12,0.92)',
  green: 'rgba(0,176,80,0.95)',
  navy: 'rgba(0,16,48,0.92)',
}

const toneArrow: Record<Tone, string> = {
  pink: '#DB2777',
  orange: '#EA580C',
  green: dark.green,
  navy: dark.textPrimary,
}

export function CodeRouteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadAccess = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setAccessLoading(true)
    try {
      const [me, catalog, journeyData] = await Promise.all([
        fetchAccessMe(),
        fetchAccessModules(),
        fetchLearnerJourney().catch(() => null),
      ])
      setAccessMe(me)
      setModules(catalog)
      setJourney(journeyData)
    } catch {
      setAccessMe(null)
      setModules([])
      setJourney(null)
    } finally {
      setAccessLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      void loadAccess(true)
      return () => setStatusBarStyle('dark')
    }, [loadAccess]),
  )

  const chapterProgress = useMemo(() => {
    if (!journey?.code.chaptersTotal) return 0
    return Math.max(0, Math.min(1, journey.code.chaptersDone / journey.code.chaptersTotal))
  }, [journey])

  const categories = useMemo<Category[]>(() => {
    const examTotal = journey?.practiceExams.examTotal
    return [
      {
        id: 'RevisionChapitres',
        label: 'Révision par chapitres',
        subtitle: 'Révise chapitre par chapitre avec des questions ciblées.',
        image: require('../../assets/code-route/cards/revision.jpg'),
        tone: 'pink',
        Icon: Pencil,
      },
      {
        id: 'ExamensTest',
        label: 'Examens test',
        subtitle:
          typeof examTotal === 'number' && examTotal > 0
            ? `${examTotal} sujets disponibles pour te tester.`
            : 'Sujets pour te tester sur tous les chapitres.',
        image: require('../../assets/code-route/cards/examens.jpg'),
        tone: 'orange',
        Icon: ClipboardList,
      },
      {
        id: 'MesNotes',
        label: 'Mes notes & avancée',
        subtitle: 'Suis tes résultats et ta progression en temps réel.',
        image: require('../../assets/code-route/cards/notes.jpg'),
        tone: 'green',
        Icon: LineChart,
      },
      {
        id: 'CodeCours',
        label: 'Cours',
        subtitle: 'Accède à tous les cours et modules expliqués en détail.',
        image: require('../../assets/code-route/cards/ecodepermis.jpg'),
        tone: 'navy',
        Icon: GraduationCap,
      },
    ]
  }, [journey])

  if (loading || !user) return <ScreenLoader />

  const codeModule = modules.find((m) => m.key === 'code')
  const codePrice = codeModule ? computeModuleAmount('code', codeModule.price, 1) : 2000
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: codeModule?.currency || 'XOF',
      maximumFractionDigits: 0,
    }).format(amount)
  const unitSuffix: Record<AccessModule['unit'], string> = {
    flat: '',
    day: ' / jour',
    month: ' / mois',
    hour: ' / heure',
    week: ' / semaine',
  }
  const pricePeriod = codeModule ? unitSuffix[codeModule.unit] : ' / mois'
  const operatorLabels = PAYMENT_OPERATORS.map((op) => op.label).join(', ')
  const unlockBenefits = [
    {
      key: 'revision',
      title: 'Révision complète',
      description: 'Tous les chapitres du Code de la route',
      Icon: BookOpen,
      short: 'Révision complète',
    },
    {
      key: 'tests',
      title: 'Sujets test',
      description:
        typeof journey?.practiceExams.examTotal === 'number' &&
        journey.practiceExams.examTotal > 0
          ? `${journey.practiceExams.examTotal} sujets pour t’évaluer`
          : 'Tests illimités pour t’évaluer',
      Icon: ClipboardList,
      short: 'Sujets test illimités',
    },
    {
      key: 'exams',
      title: 'Examens blancs',
      description: 'En conditions réelles comme à l’examen',
      Icon: Trophy,
      short: 'Examens blancs',
    },
  ] as const

  const header = (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Retour"
        hitSlop={10}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.topBarCenter}>
        <CodeModuleIcon size={28} />
        <Text style={styles.topBarTitle}>Code de la route</Text>
      </View>
      <View style={styles.roundBtnSpacer} accessibilityElementsHidden />
    </View>
  )

  if (accessLoading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <View style={styles.loadingPad}>
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
            <SkeletonList count={3} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!accessMe?.access.code) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <ScrollView
            contentContainerStyle={styles.subscribeScroll}
            showsVerticalScrollIndicator={false}
          >
            <FadeUp delay={40}>
              <LinearGradient
                colors={['#E8F8EF', '#F0FDF4', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>Débloque tout le contenu</Text>
                  <Text style={styles.heroSub}>
                    Accède à toutes nos ressources pour réussir ton examen du Code de la route.
                  </Text>
                  <View style={styles.heroChecks}>
                    {unlockBenefits.map((item) => (
                      <View key={item.key} style={styles.heroCheckRow}>
                        <View style={styles.heroCheck}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                        <Text style={styles.heroCheckText}>{item.short}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.heroArt} accessibilityElementsHidden>
                  <CodeModuleIcon size={88} />
                </View>
              </LinearGradient>
            </FadeUp>

            <FadeUp delay={80}>
              <View style={styles.subscribeBlock}>
                <View style={styles.accessLock}>
                  <Lock size={28} color={dark.green} />
                </View>
                <Text style={styles.accessStateTitle}>Souscrire au Code</Text>
                <Text style={styles.accessStateCopy}>
                  Forfait {formatPrice(codePrice)}
                  {pricePeriod} pour débloquer la révision, les sujets test et l’examen blanc.
                </Text>
              </View>
            </FadeUp>

            <FadeUp delay={110}>
              <View style={styles.benefitsCard}>
                {unlockBenefits.map((item, index) => {
                  const Icon = item.Icon
                  return (
                    <View key={item.key}>
                      {index > 0 ? <View style={styles.benefitDivider} /> : null}
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}>
                          <Icon size={18} color={dark.green} />
                        </View>
                        <View style={styles.benefitCopy}>
                          <Text style={styles.benefitTitle}>{item.title}</Text>
                          <Text style={styles.benefitText}>{item.description}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </FadeUp>

            {codeModule ? (
              <FadeUp delay={140}>
                <View style={styles.priceCard}>
                  <View style={styles.priceIcon}>
                    <Wallet size={18} color={dark.green} />
                  </View>
                  <View style={styles.priceCopy}>
                    <Text style={styles.priceLabel}>
                      Prix{codeModule.unit === 'month' ? ' mensuel' : ''}
                    </Text>
                    <Text style={styles.priceValue}>
                      {formatPrice(codePrice)}
                      {pricePeriod}
                    </Text>
                  </View>
                  <View style={styles.secureBadge}>
                    <ShieldCheck size={12} color={dark.green} />
                    <Text style={styles.secureBadgeText}>Paiement sécurisé</Text>
                  </View>
                </View>
              </FadeUp>
            ) : null}

            <FadeUp delay={170}>
              <View style={styles.secureCard}>
                <ShieldCheck size={18} color={dark.green} />
                <View style={styles.secureCopy}>
                  <Text style={styles.secureTitle}>Paiement 100% sécurisé via Mobile Money</Text>
                  {operatorLabels ? (
                    <Text style={styles.secureOperators}>{operatorLabels}</Text>
                  ) : null}
                </View>
              </View>
            </FadeUp>
          </ScrollView>

          <View style={styles.stickyBar}>
            <Bouncy scaleTo={0.98} onPress={() => setCheckoutOpen(true)}>
              <View style={styles.accessButton} accessibilityRole="button">
                <Smartphone size={18} color="#FFFFFF" />
                <Text style={styles.accessButtonText}>Payer {formatPrice(codePrice)}</Text>
                <View style={styles.accessButtonArrow}>
                  <ChevronRight size={16} color={dark.green} />
                </View>
              </View>
            </Bouncy>
            <View style={styles.stickySecureRow}>
              <Check size={12} color={dark.green} strokeWidth={3} />
              <Text style={styles.stickySecureText}>
                Paiement 100% sécurisé via Mobile Money
              </Text>
            </View>
          </View>

          <MobileMoneyCheckout
            visible={checkoutOpen}
            items={[{ module: 'code', quantity: 1 }]}
            modules={modules}
            defaultPhone={user.phone}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(access) => {
              setAccessMe(access)
              setCheckoutOpen(false)
            }}
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadAccess(true)
              }}
              tintColor={dark.green}
            />
          }
        >
          <FadeUp delay={40}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressSeg, styles.progressGreen, { flex: Math.max(chapterProgress, 0.08) }]} />
              <View style={[styles.progressSeg, styles.progressGold, { flex: 0.18 }]} />
              <View style={[styles.progressSeg, styles.progressNavy, { flex: Math.max(0.12, 1 - chapterProgress) }]} />
            </View>
            {journey?.code.chaptersTotal ? (
              <Text style={styles.progressCaption}>
                {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres
                {journey.code.currentStop?.chapterName
                  ? ` · ${journey.code.currentStop.chapterName}`
                  : ''}
              </Text>
            ) : null}
          </FadeUp>

          <FadeUp delay={100}>
            <CodeRouteBanner />
          </FadeUp>

          <View style={styles.grid}>
            {categories.map((category, index) => {
              const Icon = category.Icon
              return (
                <FadeUp key={category.id} delay={160 + index * 60} style={styles.gridItem}>
                  <Bouncy
                    scaleTo={0.98}
                    onPress={() => {
                      navigation.navigate(category.id)
                    }}
                  >
                    <View style={styles.card}>
                      <Image source={category.image} style={styles.cardImage} resizeMode="cover" />
                      <LinearGradient
                        colors={[...toneShade[category.tone]]}
                        locations={[0, 0.4, 1]}
                        style={styles.cardShade}
                        pointerEvents="none"
                      />
                      <View style={styles.cardBody}>
                        <View
                          style={[
                            styles.cardIcon,
                            { backgroundColor: toneIconBg[category.tone] },
                          ]}
                        >
                          <Icon size={16} color="#FFFFFF" />
                        </View>
                        <Text style={styles.cardTitle}>{category.label}</Text>
                        <Text style={styles.cardSubtitle} numberOfLines={3}>
                          {category.subtitle}
                        </Text>
                        <View style={styles.cardArrow}>
                          <ChevronRight size={16} color={toneArrow[category.tone]} />
                        </View>
                      </View>
                    </View>
                  </Bouncy>
                </FadeUp>
              )
            })}
          </View>

          <FadeUp delay={480}>
            <View style={styles.footer}>
              <HomeBottomAnimation compact />
            </View>
          </FadeUp>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.05)',
    ...shadows.sm,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  roundBtnSpacer: {
    width: 44,
    height: 44,
  },
  loadingPad: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  subscribeScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 16,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: dark.textPrimary,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  heroChecks: {
    gap: 8,
    marginTop: 4,
  },
  heroCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheckText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  heroArt: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...shadows.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  benefitDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,16,48,0.08)',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,176,80,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  benefitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  benefitTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  benefitText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    ...shadows.sm,
  },
  priceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  priceLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
  },
  priceValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.35)',
    backgroundColor: brand.greenPale,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secureBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: dark.green,
  },
  secureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: brand.greenPale,
    borderRadius: 20,
    padding: 16,
  },
  secureCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  secureTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  secureOperators: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    gap: 10,
    ...shadows.md,
  },
  stickySecureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stickySecureText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
  },
  accessButtonArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    letterSpacing: -0.2,
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressSeg: {
    height: 5,
    borderRadius: 999,
  },
  progressGreen: {
    backgroundColor: dark.green,
    minWidth: 24,
  },
  progressGold: {
    backgroundColor: '#FFC000',
    minWidth: 18,
  },
  progressNavy: {
    backgroundColor: dark.textPrimary,
    minWidth: 14,
  },
  progressCaption: {
    marginBottom: 14,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: dark.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47.5%',
    flexGrow: 1,
  },
  card: {
    height: 196,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardShade: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBody: {
    zIndex: 2,
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    lineHeight: 17,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.92)',
  },
  cardArrow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  footer: {
    marginTop: 8,
  },
  accessLock: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    ...shadows.sm,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
  },
  accessButton: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: dark.green,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  accessButtonText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
})
