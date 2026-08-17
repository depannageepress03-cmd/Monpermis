import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Brain,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  HelpCircle,
  LineChart,
  ShieldCheck,
  Square,
  SquareCheckBig,
  Target,
  Trophy,
} from 'lucide-react-native'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import {
  ContentError,
  fetchChapterQuestions,
  fetchChapterTestSubjects,
  fetchLearnerProgress,
  type RevisionQuestion,
  type TestProgressEntry,
} from '../../api/revision'
import { rememberChapterOrder } from '../../data/codeRoute/chapterIndex'
import { Bouncy } from '../../components/Bouncy'
import { FadeUp } from '../../components/FadeUp'
import { HomeBottomAnimation } from '../../components/HomeBottomAnimation'
import { LegalFooter } from '../../components/LegalFooter'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, radii, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestionsList'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestionsList'>

function QuestionsNotebookDecor() {
  return (
    <View style={qStyles.decor} accessibilityElementsHidden>
      <Svg width={108} height={108} viewBox="0 0 108 108">
        <Rect x="28" y="16" width="52" height="68" rx="12" fill={dark.green} />
        <Rect x="34" y="22" width="40" height="56" rx="8" fill="#FFFFFF" />
        <Circle cx="54" cy="48" r="14" fill={dark.greenSoft} />
        <Path
          d="M54 40v10c0 2 1.5 3.5 3.5 3.5"
          stroke={dark.green}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="54" cy="60" r="2.2" fill={dark.green} />
        <Path
          d="M72 70c8 4 14 12 14 20"
          stroke="#FFC000"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M82 82l10 14" stroke="#FFC000" strokeWidth="5" strokeLinecap="round" />
        <Circle cx="24" cy="30" r="3" fill={dark.green} opacity="0.35" />
        <Circle cx="88" cy="28" r="2.5" fill={dark.green} opacity="0.45" />
        <Circle cx="20" cy="70" r="2" fill={dark.green} opacity="0.3" />
      </Svg>
    </View>
  )
}

function chapterTitleParts(chapterName: string, chapterOrder?: number) {
  const trimmed = (chapterName || '').trim()
  const match = trimmed.match(/^(\d+)\.\s*(.*)$/)
  if (match) {
    return {
      order: Number(match[1]) || chapterOrder || 0,
      name: match[2] || trimmed,
      display: trimmed,
    }
  }
  const order = chapterOrder || 0
  return {
    order,
    name: trimmed || (order ? `Chapitre ${order}` : 'Questions'),
    display: order ? `${order}. ${trimmed || `Chapitre ${order}`}` : trimmed || 'Questions',
  }
}

export function ChapterQuestionsListScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, chapterOrder } = route.params

  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [testEntry, setTestEntry] = useState<TestProgressEntry | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      rememberChapterOrder(chapterId, chapterOrder, chapterName)
      const [list, progress] = await Promise.all([
        fetchChapterQuestions(chapterId),
        fetchLearnerProgress(chapterId).catch(() => null),
      ])
      setQuestions(list)
      setSelectedIds(new Set(list.map((q) => q.id)))
      const entry =
        progress?.completedTests?.find((item) => item.chapterId === chapterId) || null
      setTestEntry(entry)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
      setTestEntry(null)
    } finally {
      setLoadingList(false)
    }
  }, [chapterId, chapterOrder, chapterName])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void load()
      return () => setStatusBarStyle('dark')
    }, [user, load]),
  )

  const titleParts = useMemo(
    () => chapterTitleParts(chapterName, chapterOrder),
    [chapterName, chapterOrder],
  )
  const count = questions.length
  const testRatio =
    testEntry && testEntry.total > 0
      ? Math.max(0, Math.min(1, testEntry.correct / testEntry.total))
      : null

  if (loading || !user) return <ScreenLoader />

  const toggleQuestion = (questionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(questions.map((q) => q.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const startTraining = () =>
    navigation.navigate('ChapterQuestions', {
      chapterId,
      chapterName,
      chapterOrder,
      mode: 'practice',
      selectedQuestionIds: [...selectedIds],
    })

  return (
    <View style={qStyles.root}>
      <SafeAreaView style={qStyles.safe} edges={['top', 'bottom']}>
        <View style={qStyles.topBar}>
          <Pressable
            style={({ pressed }) => [qStyles.roundBtn, pressed && qStyles.pressed]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
            hitSlop={10}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={qStyles.topBarCenter}>
            <View style={qStyles.topBarIcon}>
              <HelpCircle size={15} color="#FFFFFF" />
            </View>
            <Text style={qStyles.topBarTitle} numberOfLines={1}>
              {titleParts.display}
            </Text>
          </View>
          <View style={qStyles.roundBtnSpacer} accessibilityElementsHidden />
        </View>

        <ScrollView
          contentContainerStyle={qStyles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={40}>
            <View style={qStyles.introRow}>
              <View style={qStyles.introCopy}>
                <Text style={qStyles.kicker}>Entraînement</Text>
                <Text style={qStyles.title}>Questions</Text>
                <Text style={qStyles.subtitle}>
                  {loadingList
                    ? 'Chargement…'
                    : count > 0
                      ? `${count} question${count !== 1 ? 's' : ''} — entraînez-vous à votre rythme.`
                      : 'Aucune question publiée pour ce chapitre.'}
                </Text>
              </View>
              <QuestionsNotebookDecor />
            </View>
          </FadeUp>

          {loadingList ? <SkeletonList count={3} /> : null}
          {error ? <Text style={qStyles.errorText}>{error}</Text> : null}

          {!loadingList && !error && count === 0 ? (
            <View style={qStyles.centerBox}>
              <Text style={qStyles.emptyTitle}>Aucune question</Text>
              <Text style={qStyles.emptyText}>Aucune question publiée pour ce chapitre.</Text>
            </View>
          ) : null}

          {!loadingList && !error && count > 0 ? (
            <>
              <FadeUp delay={100}>
                <View style={qStyles.statsCard}>
                  <View style={qStyles.statsRow}>
                    <View style={qStyles.statItem}>
                      <View style={qStyles.statIcon}>
                        <HelpCircle size={14} color={dark.green} />
                      </View>
                      <Text style={qStyles.statValue}>{count}</Text>
                      <Text style={qStyles.statLabel}>Questions</Text>
                    </View>
                    {testRatio != null ? (
                      <View style={qStyles.statItem}>
                        <View style={qStyles.statIcon}>
                          <Target size={14} color={dark.green} />
                        </View>
                        <Text style={qStyles.statValue}>{Math.round(testRatio * 100)}%</Text>
                        <Text style={qStyles.statLabel}>Sujet test</Text>
                      </View>
                    ) : null}
                    {testEntry ? (
                      <View style={qStyles.statItem}>
                        <View style={qStyles.statIcon}>
                          <Trophy size={14} color={dark.green} />
                        </View>
                        <Text style={qStyles.statValue}>
                          {testEntry.correct}/{testEntry.total}
                        </Text>
                        <Text style={qStyles.statLabel}>Meilleur score</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={qStyles.progressTrack}>
                    <View
                      style={[
                        qStyles.progressFill,
                        { width: `${Math.round((testRatio ?? 0) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={qStyles.progressCaption}>
                    {testEntry
                      ? `Sujet test : ${testEntry.correct} / ${testEntry.total}`
                      : `${count} question${count !== 1 ? 's' : ''} à travailler`}
                  </Text>
                </View>
              </FadeUp>

              <FadeUp delay={160}>
                <View style={qStyles.selectBar}>
                  <Pressable style={qStyles.selectBtn} onPress={selectAll}>
                    <CheckSquare size={16} color={dark.green} />
                    <Text style={qStyles.selectBtnText}>Tout sélectionner</Text>
                  </Pressable>
                  <Pressable style={qStyles.selectBtn} onPress={deselectAll}>
                    <Square size={16} color={dark.textMuted} />
                    <Text style={qStyles.selectBtnTextAlt}>Tout désélectionner</Text>
                  </Pressable>
                </View>
                <Text style={qStyles.selectCounter}>
                  {selectedIds.size} / {count} question{count !== 1 ? 's' : ''} sélectionnée{count !== 1 ? 's' : ''}
                </Text>
                <View style={qStyles.questionChecklist}>
                  {questions.map((q, qi) => {
                    const checked = selectedIds.has(q.id)
                    const excerpt = q.prompt?.text
                      ? q.prompt.text.replace(/<[^>]*>/g, '').substring(0, 60)
                      : `Question ${qi + 1}`
                    return (
                      <Pressable
                        key={q.id}
                        style={({ pressed }) => [
                          qStyles.questionCheckRow,
                          pressed && qStyles.pressed,
                        ]}
                        onPress={() => toggleQuestion(q.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                      >
                        {checked ? (
                          <SquareCheckBig size={22} color={dark.green} />
                        ) : (
                          <Square size={22} color="rgba(0,16,48,0.24)" />
                        )}
                        <Text style={qStyles.questionCheckLabel} numberOfLines={2}>
                          <Text style={qStyles.questionCheckNum}>{qi + 1}. </Text>
                          {excerpt}{excerpt.length >= 60 ? '…' : ''}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </FadeUp>

              <FadeUp delay={200}>
                <Bouncy scaleTo={0.98} onPress={startTraining}>
                  <LinearGradient
                    colors={['#00D566', '#00A344']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={qStyles.startBtn}
                  >
                    <View style={qStyles.startIcon}>
                      <HelpCircle size={16} color={dark.green} />
                    </View>
                    <Text style={qStyles.startBtnText}>Commencer l’entraînement</Text>
                    <ChevronRight size={20} color="#FFFFFF" />
                  </LinearGradient>
                </Bouncy>
              </FadeUp>

              <FadeUp delay={220}>
                <View style={qStyles.featuresCard}>
                  <Text style={qStyles.featuresTitle}>Dans ce chapitre</Text>
                  <View style={qStyles.featuresGrid}>
                    <View style={qStyles.featureItem}>
                      <View style={qStyles.featureIcon}>
                        <FileQuestion size={16} color={dark.green} />
                      </View>
                      <Text style={qStyles.featureLabel}>Questions variées</Text>
                      <Text style={qStyles.featureDesc}>QCM et mises en situation</Text>
                    </View>
                    <View style={qStyles.featureItem}>
                      <View style={qStyles.featureIcon}>
                        <Brain size={16} color={dark.green} />
                      </View>
                      <Text style={qStyles.featureLabel}>Entraînement</Text>
                      <Text style={qStyles.featureDesc}>À votre rythme</Text>
                    </View>
                    <View style={qStyles.featureItem}>
                      <View style={qStyles.featureIcon}>
                        <LineChart size={16} color={dark.green} />
                      </View>
                      <Text style={qStyles.featureLabel}>Suivi</Text>
                      <Text style={qStyles.featureDesc}>Chapitre par chapitre</Text>
                    </View>
                    <View style={qStyles.featureItem}>
                      <View style={qStyles.featureIcon}>
                        <ShieldCheck size={16} color={dark.green} />
                      </View>
                      <Text style={qStyles.featureLabel}>Préparation</Text>
                      <Text style={qStyles.featureDesc}>Puis sujet test</Text>
                    </View>
                  </View>
                </View>
              </FadeUp>
            </>
          ) : null}

          <FadeUp delay={280}>
            <View style={qStyles.footerAnim}>
              <HomeBottomAnimation compact />
            </View>
          </FadeUp>
          <LegalFooter />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

type TestNav = NativeStackNavigationProp<RootStackParamList, 'ChapterTestSubject'>
type TestRoute = RouteProp<RootStackParamList, 'ChapterTestSubject'>

export function ChapterTestSubjectScreen() {
  const navigation = useNavigation<TestNav>()
  const route = useRoute<TestRoute>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, chapterOrder } = route.params

  const [subjects, setSubjects] = useState<
    { number: number; id: string; label: string; questionCount: number }[]
  >([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      rememberChapterOrder(chapterId, chapterOrder, chapterName)
      const data = await fetchChapterTestSubjects(chapterId)
      const list = Array.isArray(data?.subjects) ? data.subjects : []
      setSubjects(list)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setSubjects([])
    } finally {
      setLoadingList(false)
    }
  }, [chapterId, chapterOrder, chapterName])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={tStyles.root}>
      <SafeAreaView style={tStyles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title={chapterName}
          icon={ClipboardList}
          onBack={() => navigation.goBack()}
          numberOfLines={2}
        />

        <ScrollView contentContainerStyle={tStyles.scroll} showsVerticalScrollIndicator={false}>
          <View style={tStyles.header}>
            <Text style={tStyles.kicker}>Évaluation</Text>
            <Text style={tStyles.title}>Sujets test</Text>
            <Text style={tStyles.subtitle}>
              {subjects.length > 0
                ? `${subjects.length} sujet${subjects.length > 1 ? 's' : ''} — choisissez-en un.`
                : 'Chaque sujet propose un jeu de questions différent.'}
            </Text>
          </View>

          {loadingList ? <SkeletonList count={3} /> : null}
          {error ? <Text style={tStyles.errorText}>{error}</Text> : null}

          {!loadingList && !error && subjects.length === 0 ? (
            <View style={tStyles.centerBox}>
              <Text style={tStyles.emptyTitle}>Aucun sujet test</Text>
              <Text style={tStyles.emptyText}>Aucune question publiée pour ce chapitre.</Text>
            </View>
          ) : null}

          {!loadingList && !error
            ? subjects.map((subject) => (
                <Pressable
                  key={subject.id || `sujet-${subject.number}`}
                  style={({ pressed }) => [tStyles.startBtn, pressed && tStyles.pressed]}
                  onPress={() =>
                    navigation.navigate('ChapterQuestions', {
                      chapterId,
                      chapterName,
                      chapterOrder,
                      mode: 'test',
                      subjectNumber: subject.number,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={subject.label}
                >
                  <ClipboardList size={20} color="#0B0F1A" />
                  <View style={tStyles.subjectCopy}>
                    <Text style={tStyles.startBtnText}>{subject.label}</Text>
                    <Text style={tStyles.subjectMeta}>
                      {subject.questionCount} question
                      {subject.questionCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#0B0F1A" />
                </Pressable>
              ))
            : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const qStyles = StyleSheet.create({
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 20,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 30,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  decor: {
    width: 108,
    height: 108,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    ...shadows.card,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,16,48,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  progressCaption: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: dark.textMuted,
  },
  startBtn: {
    minHeight: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    ...shadows.md,
  },
  startIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  featuresCard: {
    backgroundColor: dark.greenSoft,
    borderRadius: 24,
    padding: 16,
    marginBottom: 8,
  },
  featuresTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  featureLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  featureDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: dark.textMuted,
  },
  footerAnim: {
    marginTop: 4,
    marginBottom: 4,
  },
  selectBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.1)',
  },
  selectBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
  },
  selectBtnTextAlt: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textMuted,
  },
  selectCounter: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  questionChecklist: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    marginBottom: 14,
    ...shadows.sm,
  },
  questionCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  questionCheckLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: dark.textPrimary,
  },
  questionCheckNum: {
    fontFamily: fonts.bodySemiBold,
    color: dark.green,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: dark.coral,
    marginBottom: 12,
    fontFamily: fonts.bodySemiBold,
  },
  pressed: {
    opacity: 0.9,
  },
})

const tStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    backgroundColor: dark.green,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  startBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  subjectCopy: {
    flex: 1,
    gap: 2,
  },
  subjectMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(11,15,26,0.72)',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: dark.coral,
    marginBottom: 12,
    fontFamily: fonts.bodySemiBold,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
})
