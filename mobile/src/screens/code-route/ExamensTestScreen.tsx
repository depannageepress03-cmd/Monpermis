import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ClipboardCheck } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  checkPracticeExamAnswer,
  completePracticeExam,
  ContentError,
  fetchPracticeExams,
  startPracticeExam,
  type PracticeExamAttempt,
  type PracticeExamsOverview,
} from '../../api/revision'
import { PageNavbar } from '../../components/PageNavbar'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'

type ListNav = NativeStackNavigationProp<RootStackParamList, 'ExamensTest'>
type TakeNav = NativeStackNavigationProp<RootStackParamList, 'ExamensTestTake'>
type TakeRoute = RouteProp<RootStackParamList, 'ExamensTestTake'>

export function ExamensTestScreen() {
  const navigation = useNavigation<ListNav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [data, setData] = useState<PracticeExamsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setData(await fetchPracticeExams())
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      if (!silent) setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => {
      void load(true)
    }, 5000)
    return () => clearInterval(timer)
  }, [user, load])

  const handleStart = async (examNumber: number) => {
    setStarting(examNumber)
    setError(null)
    try {
      await startPracticeExam(examNumber)
      navigation.navigate('ExamensTestTake', { examNumber })
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Démarrage impossible')
    } finally {
      setStarting(null)
    }
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title="Examens test"
          icon={ClipboardCheck}
          onBack={() => navigation.navigate('CodeRoute')}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load(true)
              }}
              tintColor={brand.green}
            />
          }
        >
          <Text style={styles.kicker}>Auto-évaluation</Text>
          <Text style={styles.title}>Examens test</Text>
          <Text style={styles.subtitle}>
            {data?.examTotal ?? 24} examens blancs · {data?.requiredSize ?? 20} questions · note /20
            · moyenne {data?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={brand.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data ? (
            <>
              {data.unlocked === false ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedTitle}>Examens test verrouillés</Text>
                  <Text style={styles.empty}>
                    {data.message ||
                      'Terminez tous les cours de chaque chapitre pour débloquer les examens test. Vous pouvez encore répondre aux questions et passer le sujet test de chaque chapitre.'}
                  </Text>
                  <Pressable
                    style={styles.revisionBtn}
                    onPress={() => navigation.navigate('RevisionChapitres')}
                  >
                    <Text style={styles.revisionBtnText}>Continuer la révision</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.banner}>
                    <View style={styles.bannerItem}>
                      <Text style={styles.bannerValue}>
                        {data.completedCount}/{data.examTotal}
                      </Text>
                      <Text style={styles.bannerLabel}>passés</Text>
                    </View>
                    <View style={styles.bannerItem}>
                      <Text style={styles.bannerValue}>
                        {data.passedCount}/{data.examTotal}
                      </Text>
                      <Text style={styles.bannerLabel}>réussis</Text>
                    </View>
                    <Pressable
                      style={styles.notesLink}
                      onPress={() => navigation.navigate('MesNotes')}
                    >
                      <Text style={styles.notesLinkText}>Mes notes</Text>
                    </Pressable>
                  </View>

                  {data.message ? <Text style={styles.empty}>{data.message}</Text> : null}

                  {data.exams.map((exam) => (
                    <View
                      key={exam.id}
                      style={[
                        styles.examCard,
                        exam.status === 'completed' && styles.status_completed,
                        exam.status === 'in_progress' && styles.status_in_progress,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.examTitle}>Examen {exam.examNumber}</Text>
                        <Text style={styles.examMeta}>
                          {exam.questionCount} questions
                          {exam.score
                            ? ` · ${exam.score.scoreLabel}${exam.score.passed ? ' · Réussi' : ''}`
                            : exam.status === 'in_progress'
                              ? ' · En cours'
                              : ''}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.startBtn}
                        disabled={starting === exam.examNumber || data.examCount === 0}
                        onPress={() => void handleStart(exam.examNumber)}
                      >
                        <Text style={styles.startBtnText}>
                          {starting === exam.examNumber
                            ? '…'
                            : exam.status === 'completed'
                              ? 'Repasser'
                              : exam.status === 'in_progress'
                                ? 'Continuer'
                                : 'Go'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export function ExamensTestTakeScreen() {
  const navigation = useNavigation<TakeNav>()
  const route = useRoute<TakeRoute>()
  const { examNumber } = route.params
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [attempt, setAttempt] = useState<PracticeExamAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    correctAnswerIds: string[]
  } | null>(null)
  const [liveCorrect, setLiveCorrect] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState<{
    correct: number
    total: number
    scoreLabel: string
    passed: boolean
    passScore: number
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startPracticeExam(examNumber)
      setAttempt(started)
      const answered = started.answeredCount || 0
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)))
      setSelectedIds([])
      setResult(null)
      setLiveCorrect(started.liveCorrect || 0)
      setAnsweredCount(answered)
      setFinished(started.status === 'completed')
      if (started.status === 'completed') {
        setFinalScore({
          correct: started.correct,
          total: started.total,
          scoreLabel: started.scoreLabel,
          passed: started.passed,
          passScore: started.passScore,
        })
      }
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [examNumber])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const questions = attempt?.questions || []
  const question = questions[index]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `Question ${Math.min(index + 1, questions.length)} / ${questions.length}`
  }, [index, questions.length])

  const toggleAnswer = (answerId: string) => {
    if (result || checking) return
    setSelectedIds((current) =>
      current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId],
    )
  }

  const handleCheck = async () => {
    if (!attempt || !question || selectedIds.length === 0 || checking) return
    setChecking(true)
    try {
      const data = await checkPracticeExamAnswer(attempt.id, question.id, selectedIds)
      setResult({ isCorrect: data.isCorrect, correctAnswerIds: data.correctAnswerIds })
      setLiveCorrect(data.liveCorrect)
      setAnsweredCount(data.answeredCount)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }

  const goNext = async () => {
    if (!attempt) return
    if (index + 1 >= questions.length) {
      try {
        const { attempt: score } = await completePracticeExam(attempt.id)
        setFinalScore(score)
        setFinished(true)
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Validation impossible')
      }
      return
    }
    setIndex((value) => value + 1)
    setSelectedIds([])
    setResult(null)
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title={`Examen ${examNumber}`}
          icon={ClipboardCheck}
          onBack={() => navigation.navigate('ExamensTest')}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Examen blanc</Text>
          <Text style={styles.title}>Examen {examNumber}</Text>
          <Text style={styles.subtitle}>
            Note en direct : {liveCorrect}/{attempt?.total ?? 20} · Seuil{' '}
            {attempt?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={brand.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {finished && finalScore ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {finalScore.passed ? 'Examen réussi' : 'Examen non réussi'}
              </Text>
              <Text style={styles.resultScore}>{finalScore.scoreLabel}</Text>
              <Pressable style={styles.startBtn} onPress={() => navigation.navigate('MesNotes')}>
                <Text style={styles.startBtnText}>Voir mes notes</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && question && !finished ? (
            <View style={styles.quizBox}>
              <Text style={styles.progress}>
                {progressLabel} · Score live {liveCorrect}/{answeredCount || '—'}
              </Text>
              {question.prompt?.text ? (
                <Text style={styles.prompt}>{question.prompt.text}</Text>
              ) : null}
              {question.prompt?.audioUrl || question.answers.some((a) => a.audioUrl) ? (
                <QuestionAudioSequence
                  questionKey={question.id}
                  promptUri={resolveMediaUrl(question.prompt?.audioUrl)}
                  answerUris={question.answers.map((a) => resolveMediaUrl(a.audioUrl))}
                />
              ) : null}
              {question.answers.map((answer) => {
                const selected = selectedIds.includes(answer.id)
                const isCorrect = result?.correctAnswerIds.includes(answer.id)
                return (
                  <Pressable
                    key={answer.id}
                    style={[
                      styles.answer,
                      selected && styles.answerSelected,
                      result && isCorrect && styles.answerCorrect,
                      result && selected && !isCorrect && styles.answerWrong,
                    ]}
                    onPress={() => toggleAnswer(answer.id)}
                    disabled={Boolean(result) || checking}
                  >
                    <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                    {answer.text ? <Text style={styles.answerMeta}>{answer.text}</Text> : null}
                  </Pressable>
                )
              })}

              {result ? (
                <Text style={result.isCorrect ? styles.ok : styles.error}>
                  {result.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
                </Text>
              ) : null}

              {!result ? (
                <Pressable
                  style={[styles.startBtn, selectedIds.length === 0 && styles.disabled]}
                  disabled={selectedIds.length === 0 || checking}
                  onPress={() => void handleCheck()}
                >
                  <Text style={styles.startBtnText}>
                    {checking ? 'Vérification…' : 'Valider'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.startBtn} onPress={() => void goNext()}>
                  <Text style={styles.startBtnText}>
                    {index + 1 >= questions.length ? 'Voir la note /20' : 'Suivant'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 28 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: brand.green,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: brand.navy, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, color: brand.navyMuted, marginBottom: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.greenLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${brand.green}28`,
  },
  bannerItem: { flex: 1 },
  bannerValue: { fontSize: 18, fontWeight: '800', color: brand.navy },
  bannerLabel: { fontSize: 12, color: brand.navyMuted },
  notesLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${brand.navy}20`,
    backgroundColor: colors.white,
  },
  notesLinkText: { fontWeight: '700', color: brand.navy, fontSize: 13 },
  lockedBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
    backgroundColor: `${brand.navy}04`,
    gap: 12,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: brand.navy,
  },
  revisionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: brand.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  revisionBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 10,
  },
  status_available: {},
  status_in_progress: {
    backgroundColor: brand.goldLight,
    borderColor: `${brand.gold}55`,
  },
  status_completed: {
    backgroundColor: brand.greenLight,
    borderColor: `${brand.green}35`,
  },
  examTitle: { fontSize: 16, fontWeight: '800', color: brand.navy },
  examMeta: { fontSize: 13, color: brand.navyMuted, marginTop: 2 },
  startBtn: {
    backgroundColor: brand.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  disabled: { opacity: 0.5 },
  empty: { color: brand.navyMuted, marginBottom: 12 },
  error: { color: '#B91C1C', marginBottom: 10 },
  ok: { color: brand.green, fontWeight: '700', marginBottom: 10 },
  quizBox: { gap: 10 },
  progress: { fontWeight: '700', color: brand.navyMuted, marginBottom: 4 },
  prompt: { fontSize: 16, lineHeight: 24, color: brand.navy, marginBottom: 8 },
  answer: {
    borderWidth: 1,
    borderColor: `${brand.navy}15`,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  answerSelected: { borderColor: brand.green, backgroundColor: brand.greenLight },
  answerCorrect: { borderColor: brand.green, backgroundColor: brand.greenLight },
  answerWrong: { borderColor: '#B91C1C', backgroundColor: '#FEF2F2' },
  answerLabel: { fontWeight: '800', color: brand.navy },
  answerMeta: { marginTop: 4, fontSize: 13, color: brand.navyMuted },
  resultBox: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: brand.greenLight,
    gap: 12,
    alignItems: 'flex-start',
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: brand.navy },
  resultScore: { fontSize: 28, fontWeight: '800', color: brand.green },
})
