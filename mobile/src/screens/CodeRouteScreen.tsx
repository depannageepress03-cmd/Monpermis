import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  Lock,
  Monitor,
  Play,
  Search,
  ShieldCheck,
  Smartphone,
  Trophy,
  Wallet,
} from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  fetchLearnerProgress,
  fetchRevisionChapters,
  type LearnerJourney,
  type LearnerProgress,
  type RevisionChapter,
} from '../api/revision'
import { Bouncy } from '../components/Bouncy'
import { FadeUp } from '../components/FadeUp'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { ScreenLoader } from '../components/ScreenLoader'
import { SkeletonList } from '../components/Skeleton'
import { useOffline } from '../context/OfflineContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { PAYMENT_OPERATORS } from '../utils/paymentOperators'
import { brand, dark, fonts, radii, shadows } from '../theme'
import { HeroCard, RouteMotif } from '../components/ui-kit-cards'
import { LogoTile } from '../components/ui-kit-core'
import { MainTabBar } from '../components/ui-kit-nav'
import { colors, textStyles } from '../theme/tokens'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeRoute'>

function chapterStatus(
  chapter: RevisionChapter,
  completedCourseIds: Set<string>,
): 'done' | 'partial' | 'todo' {
  const total = chapter.courses.length
  const done = chapter.courses.filter((course) => completedCourseIds.has(String(course.id))).length
  if (total > 0 && done >= total) return 'done'
  if (done > 0) return 'partial'
  return 'todo'
}

export function CodeRouteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const { isOffline } = useOffline()
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [chapters, setChapters] = useState<RevisionChapter[]>([])
  const [progress, setProgress] = useState<LearnerProgress | null>(null)
  const [query, setQuery] = useState('')
  const [accessLoading, setAccessLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadAccess = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setAccessLoading(true)
    try {
      if (isOffline) {
        const cached = await import('../utils/contentCache').then((m) =>
          m.cacheGet<AccessMe>(`access:me:${user.id}`, 24 * 60 * 60 * 1000),
        )
        if (cached) {
          setAccessMe(cached.data)
          setAccessLoading(false)
          setRefreshing(false)
          return
        }
      }
      const [me, catalog, journeyData, chapterData, progressData] = await Promise.all([
        fetchAccessMe(),
        fetchAccessModules(),
        fetchLearnerJourney().catch(() => null),
        fetchRevisionChapters().catch(() => [] as RevisionChapter[]),
        fetchLearnerProgress().catch(() => null),
      ])
      setAccessMe(me)
      setModules(catalog)
      setJourney(journeyData)
      setChapters(chapterData)
      setProgress(progressData)
    } catch {
      setAccessMe(null)
      setModules([])
      setJourney(null)
    } finally {
      setAccessLoading(false)
      setRefreshing(false)
    }
  }, [user, isOffline])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      void loadAccess(true)
      return () => setStatusBarStyle('dark')
    }, [loadAccess]),
  )

  const completedCourseIds = useMemo(
    () => new Set((progress?.completedCourses ?? []).map((entry) => String(entry.courseId))),
    [progress],
  )

  const doneChapters = useMemo(
    () => chapters.filter((chapter) => chapterStatus(chapter, completedCourseIds) === 'done').length,
    [chapters, completedCourseIds],
  )

  const visibleChapters = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return chapters
    return chapters.filter((chapter) => chapter.name.toLowerCase().includes(needle))
  }, [chapters, query])

  const currentChapterName = journey?.code.currentStop?.chapterName || chapters[0]?.name || 'Ton parcours Code'
  const chaptersPercent = journey && journey.code.chaptersTotal > 0
    ? Math.round((journey.code.chaptersDone / journey.code.chaptersTotal) * 100)
    : 0

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
    <View style={mstyles.root}>
      <SafeAreaView style={mstyles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={mstyles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadAccess(true)
              }}
              tintColor={colors.green}
            />
          }
        >
          <View style={mstyles.headRow}>
            <View style={mstyles.headCopy}>
              <Text style={mstyles.h1}>Code de la route</Text>
              <Text style={mstyles.sub}>Cours, QCM et examens blancs</Text>
            </View>
            <LogoTile />
          </View>

          <View style={mstyles.search}>
            <Search size={19} color={colors.muted} strokeWidth={2.2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un panneau, un cours…"
              placeholderTextColor={colors.subtle}
              accessibilityLabel="Rechercher"
              style={mstyles.searchInput}
            />
          </View>

          <HeroCard>
            <RouteMotif />
            <View style={mstyles.resume}>
              <Text style={mstyles.kicker}>Reprendre</Text>
              <Text style={mstyles.resumeTitle} numberOfLines={2}>{currentChapterName}</Text>
              <View style={mstyles.barRow}>
                <View style={mstyles.barTrack}>
                  <View style={[mstyles.barFill, { width: `${chaptersPercent}%` }]} />
                </View>
                <Text style={mstyles.barLabel}>{journey?.code.chaptersDone ?? 0}/{journey?.code.chaptersTotal ?? 0} chapitres</Text>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('RevisionChapitres')}
              accessibilityRole="button"
              accessibilityLabel="Continuer le chapitre"
              style={({ pressed }) => [mstyles.playBtn, pressed && { opacity: 0.9 }]}
            >
              <Play size={22} color={colors.navy} fill={colors.navy} />
            </Pressable>
          </HeroCard>

          <View style={mstyles.tiles}>
            <Pressable
              onPress={() => navigation.navigate('RevisionChapitres')}
              accessibilityRole="button"
              accessibilityLabel="Révision, chapitres et cours"
              style={({ pressed }) => [mstyles.tile, pressed && { opacity: 0.95 }]}
            >
              <View style={[mstyles.tileIcon, { backgroundColor: colors.greenTint }]}>
                <BookOpen size={21} color={colors.greenDark} strokeWidth={2} />
              </View>
              <Text style={mstyles.tileTitle}>Révision</Text>
              <Text style={mstyles.tileSub}>Chapitres & cours</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('RevisionChapitres')}
              accessibilityRole="button"
              accessibilityLabel="QCM par thème"
              style={({ pressed }) => [mstyles.tile, pressed && { opacity: 0.95 }]}
            >
              <View style={[mstyles.tileIcon, { backgroundColor: colors.navyTint }]}>
                <Check size={21} color={colors.navy} strokeWidth={2.2} />
              </View>
              <Text style={mstyles.tileTitle}>QCM</Text>
              <Text style={mstyles.tileSub}>Par thème</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('ExamensTest')}
              accessibilityRole="button"
              accessibilityLabel="Examens blancs, conditions réelles"
              style={({ pressed }) => [mstyles.tile, pressed && { opacity: 0.95 }]}
            >
              <View style={[mstyles.tileIcon, { backgroundColor: colors.yellowTint }]}>
                <Flag size={21} color={colors.yellowInk} strokeWidth={2} />
              </View>
              <Text style={mstyles.tileTitle}>Examens blancs</Text>
              <Text style={mstyles.tileSub}>Conditions réelles</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('CodeCours')}
              accessibilityRole="button"
              accessibilityLabel="E-Codepermis, entraînement dédié"
              style={({ pressed }) => [mstyles.tile, mstyles.tileGreen, pressed && { opacity: 0.95 }]}
            >
              <View style={mstyles.tileIconWhite}>
                <Monitor size={21} color={colors.greenDark} strokeWidth={2} />
              </View>
              <Text style={[mstyles.tileTitle, { fontWeight: '800', color: colors.greenInk, fontFamily: 'Sora_800ExtraBold' }]}>E-Codepermis</Text>
              <Text style={[mstyles.tileSub, { color: colors.greenInk }]}>Entraînement dédié</Text>
            </Pressable>
          </View>

          <View style={mstyles.listHead}>
            <Text style={mstyles.h2}>Chapitres</Text>
            <Text style={mstyles.count}>{doneChapters} sur {chapters.length} terminés</Text>
          </View>

          <View style={mstyles.list}>
            {visibleChapters.length === 0 ? (
              <View style={mstyles.empty}>
                <Text style={mstyles.emptyText}>
                  {chapters.length === 0
                    ? 'Aucun chapitre publié pour le moment.'
                    : 'Aucun chapitre ne correspond à ta recherche.'}
                </Text>
              </View>
            ) : (
              visibleChapters.map((chapter) => {
                const status = chapterStatus(chapter, completedCourseIds)
                const numStyle =
                  status === 'done' ? mstyles.numDone : status === 'partial' ? mstyles.numCurrent : mstyles.numTodo
                const badgeStyle =
                  status === 'done' ? mstyles.badgeDone : status === 'partial' ? mstyles.badgeCurrent : mstyles.badgeTodo
                const badgeTextStyle =
                  status === 'done' ? mstyles.badgeDoneText : status === 'partial' ? mstyles.badgeCurrentText : mstyles.badgeTodoText
                return (
                  <Pressable
                    key={chapter.id}
                    onPress={() => navigation.navigate('ChapterCourses', { chapterId: chapter.id, chapterName: chapter.name, courses: chapter.courses })}
                    accessibilityRole="button"
                    accessibilityLabel={`Chapitre ${chapter.name}`}
                    style={({ pressed }) => [mstyles.row, pressed && { opacity: 0.95 }]}
                  >
                    <View style={[mstyles.num, numStyle]}>
                      <Text style={[mstyles.numText, status === 'done' && { color: colors.greenDark }, status === 'partial' && { color: colors.yellow }, status === 'todo' && { color: colors.subtle }]}>
                        {String(chapter.order).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={mstyles.rowCopy}>
                      <Text style={mstyles.rowTitle} numberOfLines={1}>{chapter.name}</Text>
                      <Text style={mstyles.rowMeta}>{chapter.courses.length} cours</Text>
                    </View>
                    <View style={[mstyles.badge, badgeStyle]}>
                      <Text style={badgeTextStyle}>
                        {status === 'done' ? 'Terminé' : status === 'partial' ? 'En cours' : 'À venir'}
                      </Text>
                    </View>
                  </Pressable>
                )
              })
            )}
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
      <MainTabBar activeId="code" />
    </View>
  )
}

const mstyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headCopy: { flex: 1 },
  h1: { fontFamily: 'Sora_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.navy },
  sub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: colors.muted, marginTop: 3 },
  h2: { fontFamily: 'Sora_700Bold', fontSize: 18, color: colors.navy },
  search: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  searchInput: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14.5, color: colors.navy, paddingVertical: 0 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resume: { flex: 1, gap: 8, minWidth: 0 },
  kicker: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.72, textTransform: 'uppercase', color: colors.yellow },
  resumeTitle: { fontFamily: 'Sora_700Bold', fontSize: 17, lineHeight: 21, color: '#FFFFFF' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.16)' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.green },
  barLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#FFFFFF' },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', borderRadius: 24, backgroundColor: '#FFFFFF', padding: 16, gap: 10 },
  tileGreen: { backgroundColor: colors.green },
  tileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileIconWhite: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: colors.navy },
  tileSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: colors.muted },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: colors.muted },
  list: { gap: 10, marginTop: -6 },
  empty: { borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  emptyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13.5, color: colors.muted },
  row: {
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 16,
  },
  num: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numDone: { backgroundColor: colors.greenTint },
  numCurrent: { backgroundColor: colors.navy },
  numTodo: { backgroundColor: colors.fieldPrefix },
  numText: { fontFamily: 'Sora_800ExtraBold', fontSize: 15 },
  rowCopy: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14.5, color: colors.navy },
  rowMeta: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: colors.muted },
  badge: { height: 28, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: colors.greenTint },
  badgeCurrent: { backgroundColor: colors.yellowTint },
  badgeTodo: { backgroundColor: colors.fieldPrefix },
  badgeDoneText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11.5, color: colors.greenDark },
  badgeCurrentText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11.5, color: colors.yellowInk },
  badgeTodoText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11.5, color: colors.muted },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAEFF6',
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
