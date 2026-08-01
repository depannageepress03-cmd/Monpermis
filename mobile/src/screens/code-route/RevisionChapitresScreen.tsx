import { useCallback, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Layers,
  LineChart,
  Star,
  Target,
  Timer,
} from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { fetchAccessMe, type AccessMe } from '../../api/accessRequests'
import {
  ContentError,
  fetchLearnerJourney,
  fetchLearnerProgress,
  fetchRevisionChaptersSWR,
  type LearnerJourney,
  type RevisionChapter,
  type TestProgressEntry,
} from '../../api/revision'
import { Bouncy } from '../../components/Bouncy'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { HomeBottomAnimation } from '../../components/HomeBottomAnimation'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { getActiveSubscriptions } from '../../utils/subscriptionSummary'
import { dark, fonts, radii, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'RevisionChapitres'>

function RevisionChecklistDecor() {
  return (
    <View style={styles.decor} accessibilityElementsHidden>
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Rect x="22" y="14" width="52" height="68" rx="12" fill="#FFFFFF" />
        <Rect x="22" y="14" width="52" height="68" rx="12" stroke="rgba(0,16,48,0.08)" />
        <Rect x="34" y="8" width="28" height="10" rx="4" fill={dark.green} />
        <Circle cx="38" cy="38" r="7" fill={dark.green} />
        <Path d="M35 38l2.2 2.2 4.4-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Rect x="50" y="35" width="16" height="5" rx="2.5" fill="#D7E3DA" />
        <Circle cx="38" cy="56" r="7" fill={dark.green} />
        <Path d="M35 56l2.2 2.2 4.4-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Rect x="50" y="53" width="16" height="5" rx="2.5" fill="#D7E3DA" />
        <Circle cx="38" cy="74" r="7" fill={dark.green} />
        <Path d="M35 74l2.2 2.2 4.4-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Rect x="50" y="71" width="16" height="5" rx="2.5" fill="#D7E3DA" />
        <Path
          d="M70 62c6 2 10 8 10 14"
          stroke="#FFC000"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M76 70l8 10" stroke="#FFC000" strokeWidth="4" strokeLinecap="round" />
      </Svg>
    </View>
  )
}

export function RevisionChapitresScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [chapters, setChapters] = useState<RevisionChapter[]>([])
  const [completedTests, setCompletedTests] = useState<TestProgressEntry[]>([])
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const completedTestIds = useMemo(
    () => new Set(completedTests.map((entry) => entry.chapterId)),
    [completedTests],
  )

  const loadChapters = useCallback(async (silent = false) => {
    if (!silent && !hasDataRef.current) setLoading(true)
    setError(null)
    try {
      const progressPromise = fetchLearnerProgress()
      const journeyPromise = fetchLearnerJourney().catch(() => null)
      const accessPromise = fetchAccessMe().catch(() => null)
      await fetchRevisionChaptersSWR((data, meta) => {
        setChapters(data)
        if (data.length > 0) hasDataRef.current = true
        if (meta.fromCache) setLoading(false)
      })
      const [progress, journeyData, access] = await Promise.all([
        progressPromise,
        journeyPromise,
        accessPromise,
      ])
      setCompletedTests(progress.completedTests || [])
      setJourney(journeyData)
      setAccessMe(access)
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void loadChapters()
      return () => setStatusBarStyle('dark')
    }, [user, loadChapters]),
  )

  const openQuestions = (chapter: RevisionChapter, index: number) => {
    const order = chapter.order || index + 1
    navigation.navigate('ChapterQuestionsList', {
      chapterId: chapter.id,
      chapterName: `${order}. ${chapter.name}`,
      chapterOrder: order,
    })
  }

  const openTestSubject = (chapter: RevisionChapter, index: number) => {
    const order = chapter.order || index + 1
    navigation.navigate('ChapterTestSubject', {
      chapterId: chapter.id,
      chapterName: `${order}. ${chapter.name}`,
      chapterOrder: order,
    })
  }

  const codeSub = useMemo(
    () => getActiveSubscriptions(accessMe).find((item) => item.module === 'code'),
    [accessMe],
  )

  const summaryItems = useMemo(() => {
    const items: { key: string; Icon: typeof Timer; text: string; tone?: 'green' | 'gold' }[] = []
    if (codeSub) {
      items.push({
        key: 'days',
        Icon: Timer,
        text: `${codeSub.daysLeft} jour${codeSub.daysLeft > 1 ? 's' : ''} restants`,
      })
    }
    if (journey?.practiceExams?.examTotal) {
      items.push({
        key: 'tests',
        Icon: Target,
        text: `${journey.practiceExams.passedCount} / ${journey.practiceExams.examTotal} sujets test réussis`,
      })
    } else if (chapters.length > 0) {
      items.push({
        key: 'chapterTests',
        Icon: Target,
        text: `${completedTestIds.size} / ${chapters.length} sujets test validés`,
      })
    }
    if (journey?.code?.chaptersTotal) {
      const pct = Math.round(
        Math.max(0, Math.min(1, journey.code.chaptersDone / journey.code.chaptersTotal)) * 100,
      )
      items.push({
        key: 'progress',
        Icon: LineChart,
        text: `${pct}% progression globale`,
      })
    }
    if (chapters.length > 0) {
      items.push({
        key: 'chapters',
        Icon: Star,
        text: `${chapters.length} chapitre${chapters.length > 1 ? 's' : ''} disponible${chapters.length > 1 ? 's' : ''}`,
        tone: 'gold',
      })
    }
    return items
  }, [accessMe, chapters.length, codeSub, completedTestIds.size, journey])

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('CodeRoute')}
            accessibilityLabel="Retour"
            hitSlop={10}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <Layers size={16} color={dark.green} />
            </View>
            <Text style={styles.topBarTitle}>Révision</Text>
          </View>
          <View style={styles.roundBtnSpacer} accessibilityElementsHidden />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadChapters(true)
              }}
              tintColor={dark.green}
            />
          }
        >
          <FadeUp delay={40}>
            <LinearGradient
              colors={['#E8F8EF', '#F4F7FB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.intro}
            >
              <View style={styles.introCopy}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Code de la route</Text>
                </View>
                <Text style={styles.introTitle}>
                  Entraînez-vous aux questions, puis validez chaque chapitre avec un sujet test.
                </Text>
              </View>
              <RevisionChecklistDecor />
            </LinearGradient>
          </FadeUp>

          {loading ? <SkeletonList count={4} /> : null}

          {error && chapters.length === 0 ? (
            <EmptyState
              icon={<Layers size={30} color={dark.textMuted} />}
              title="Chargement impossible"
              message={error}
            />
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <EmptyState
              icon={<Layers size={30} color={dark.textMuted} />}
              title="Aucun chapitre disponible"
              message="Les chapitres publiés par votre auto-école apparaîtront ici."
            />
          ) : null}

          {chapters.length > 0 && !error
            ? chapters.map((chapter, index) => {
                const order = chapter.order || index + 1
                const title = chapter.name?.trim() || `Chapitre ${order}`
                const testDone = completedTestIds.has(chapter.id)
                const testScore = completedTests.find((entry) => entry.chapterId === chapter.id)

                return (
                  <FadeUp key={chapter.id} delay={80 + Math.min(index, 8) * 40}>
                    <View style={styles.card}>
                      <Pressable
                        style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}
                        onPress={() => openQuestions(chapter, index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Chapitre ${order} : ${title}. Ouvrir les questions.`}
                      >
                        <View style={styles.iconWrap}>
                          <Text style={styles.cardNumber}>{order}</Text>
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {title}
                          </Text>
                          <View style={styles.statusRow}>
                            {testDone ? (
                              <View style={styles.statusPillDone}>
                                <Check size={12} color={dark.green} />
                                <Text style={styles.statusPillDoneText}>
                                  Test validé
                                  {testScore?.total
                                    ? ` · ${testScore.correct}/${testScore.total}`
                                    : ''}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.cardSubtitle}>Questions + sujet test</Text>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={18} color={dark.textMuted} />
                      </Pressable>

                      <View style={styles.actionsDivider} />

                      <View style={styles.actions}>
                        <Bouncy
                          scaleTo={0.98}
                          style={styles.actionFlexPrimary}
                          onPress={() => openQuestions(chapter, index)}
                        >
                          <View style={styles.actionBtnPrimary}>
                            <HelpCircle size={16} color="#FFFFFF" />
                            <Text style={styles.actionLabelPrimary}>Questions</Text>
                          </View>
                        </Bouncy>

                        <Bouncy
                          scaleTo={0.98}
                          style={styles.actionFlex}
                          onPress={() => openTestSubject(chapter, index)}
                        >
                          <View style={styles.actionBtnSecondary}>
                            <ClipboardList size={16} color={dark.textPrimary} />
                            <Text style={styles.actionLabelSecondary}>Sujet test</Text>
                          </View>
                        </Bouncy>
                      </View>
                    </View>
                  </FadeUp>
                )
              })
            : null}

          {summaryItems.length > 0 ? (
            <FadeUp delay={360}>
              <View style={styles.summaryCard}>
                {summaryItems.map((item, index) => {
                  const Icon = item.Icon
                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.summaryItem,
                        index < summaryItems.length - 1 && styles.summaryItemBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.summaryIcon,
                          item.tone === 'gold' && styles.summaryIconGold,
                        ]}
                      >
                        <Icon
                          size={14}
                          color={item.tone === 'gold' ? '#B8860B' : dark.green}
                        />
                      </View>
                      <Text style={styles.summaryText}>{item.text}</Text>
                    </View>
                  )
                })}
              </View>
            </FadeUp>
          ) : null}

          <FadeUp delay={420}>
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  roundBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  roundBtnSpacer: {
    width: 52,
    height: 52,
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: dark.green,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  introTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: dark.textPrimary,
    letterSpacing: -0.3,
  },
  decor: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.green,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  statusRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  statusPillDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: dark.greenSoft,
  },
  statusPillDoneText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
  },
  actionsDivider: {
    height: 1,
    backgroundColor: 'rgba(0,16,48,0.06)',
    marginTop: 14,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionFlexPrimary: {
    flex: 1.2,
  },
  actionFlex: {
    flex: 1,
  },
  actionBtnPrimary: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: dark.green,
  },
  actionBtnSecondary: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.12)',
  },
  actionLabelPrimary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionLabelSecondary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  summaryCard: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...shadows.card,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  summaryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.06)',
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconGold: {
    backgroundColor: '#FFF4CC',
  },
  summaryText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  footer: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.9,
  },
})
