import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ShieldCheck } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  checkECodePermisAnswer,
  completeECodePermisExam,
  ContentError,
  fetchECodePermisExams,
  startECodePermisExam,
  type PracticeExamAttempt,
  type PracticeExamsOverview,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { playFailSound, playRemoteAudio, playSuccessSound } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

type ListNav = NativeStackNavigationProp<RootStackParamList, 'ECodePermis'>
type TakeNav = NativeStackNavigationProp<RootStackParamList, 'ECodePermisTake'>
type TakeRoute = RouteProp<RootStackParamList, 'ECodePermisTake'>

export function ECodePermisScreen() {
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
      setData(await fetchECodePermisExams())
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
      await startECodePermisExam(examNumber)
      navigation.navigate('ECodePermisTake', { examNumber })
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Démarrage impossible')
    } finally {
      setStarting(null)
    }
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <PageNavbar
          title="E-Codepermis"
          icon={ShieldCheck}
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
              tintColor={dark.green}
            />
          }
        >
          <Text style={styles.kicker}>Conditions réelles</Text>
          <Text style={styles.title}>E-Codepermis</Text>
          <Text style={styles.subtitle}>
            {data?.examTotal ?? 30} épreuves mélangées aléatoirement · {data?.requiredSize ?? 20}{' '}
            questions · note /20 · seuil {data?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data ? (
            <>
              {data.unlocked === false ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedTitle}>E-Codepermis verrouillé</Text>
                  <Text style={styles.empty}>
                    {data.message ||
                      'Terminez tous les cours de chaque chapitre pour débloquer E-Codepermis.'}
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
                      <Text style={styles.bannerLabel}>passées</Text>
                    </View>
                    <View style={styles.bannerItem}>
                      <Text style={styles.bannerValue}>
                        {data.passedCount}/{data.examTotal}
                      </Text>
                      <Text style={styles.bannerLabel}>réussies</Text>
                    </View>
                    <Pressable
                      style={styles.notesLink}
                      onPress={() => navigation.navigate('MesNotes')}
                    >
                      <Text style={styles.notesLinkText}>Mes notes</Text>
                    </Pressable>
                  </View>

                  {data.exams.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>Épreuves en préparation</Text>
                      <Text style={styles.empty}>
                        {data.message ||
                          'Les épreuves seront disponibles dès que la banque de questions sera complétée par ton auto-école. Reviens bientôt !'}
                      </Text>
                    </View>
                  ) : null}

                  {data.message && data.exams.length > 0 ? (
                    <Text style={styles.empty}>{data.message}</Text>
                  ) : null}

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
                        <Text style={styles.examTitle}>Épreuve {exam.examNumber}</Text>
                        <Text style={styles.examMeta}>
                          {exam.questionCount} questions
                          {exam.score
                            ? ` · ${exam.score.scoreLabel}${exam.score.passed ? ' · Réussie' : ''}`
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
      </DarkScreen>
  )
}

export function ECodePermisTakeScreen() {
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
  const [sequenceLive, setSequenceLive] = useState(true)

  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const resultRef = useRef(result)
  resultRef.current = result
  const checkingRef = useRef(checking)
  checkingRef.current = checking
  const indexRef = useRef(index)
  indexRef.current = index
  const questionsRef = useRef<PracticeExamAttempt['questions']>([])
  const attemptRef = useRef(attempt)
  attemptRef.current = attempt
  const sequenceLiveRef = useRef(sequenceLive)
  sequenceLiveRef.current = sequenceLive

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startECodePermisExam(examNumber)
      setAttempt(started)
      const answered = started.answeredCount || 0
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)))
      setSelectedIds([])
      setResult(null)
      setLiveCorrect(started.liveCorrect || 0)
      setAnsweredCount(answered)
      setFinished(started.status === 'completed')
      setSequenceLive(true)
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

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds([])
    setResult(null)
  }, [index])

  const questions = attempt?.questions || []
  questionsRef.current = questions
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

  const finishOrAdvance = useCallback(async () => {
    const currentAttempt = attemptRef.current
    const currentIndex = indexRef.current
    const list = questionsRef.current
    if (!currentAttempt) return

    if (currentIndex + 1 >= list.length) {
      try {
        const { attempt: score } = await completeECodePermisExam(currentAttempt.id)
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
    setSequenceLive(true)
  }, [])

  const skipMissed = useCallback(async () => {
    const currentAttempt = attemptRef.current
    const currentQuestion = questionsRef.current[indexRef.current]
    if (
      !currentAttempt ||
      !currentQuestion ||
      checkingRef.current ||
      resultRef.current
    )
      return

    setChecking(true)
    setSequenceLive(false)
    try {
      const promptUrl = currentQuestion.prompt?.audioUrl
        ? resolveMediaUrl(currentQuestion.prompt.audioUrl)
        : ''
      const data = await checkECodePermisAnswer(currentAttempt.id, currentQuestion.id, [])
      setResult({ isCorrect: false, correctAnswerIds: [] })
      setLiveCorrect(data.liveCorrect)
      setAnsweredCount(data.answeredCount)
      if (promptUrl) void playRemoteAudio(promptUrl)
      void playFailSound()
      await finishOrAdvance()
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }, [finishOrAdvance])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentAttempt = attemptRef.current
      const currentQuestion = questionsRef.current[indexRef.current]
      if (
        !currentAttempt ||
        !currentQuestion ||
        ids.length === 0 ||
        checkingRef.current ||
        resultRef.current
      )
        return

      setChecking(true)
      setSequenceLive(false)
      try {
        const data = await checkECodePermisAnswer(currentAttempt.id, currentQuestion.id, ids)
        setResult({ isCorrect: data.isCorrect, correctAnswerIds: data.correctAnswerIds })
        setLiveCorrect(data.liveCorrect)
        setAnsweredCount(data.answeredCount)
        if (data.isCorrect) await playSuccessSound()
        else await playFailSound()
        await wait(900)
        await finishOrAdvance()
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
        setSequenceLive(true)
      } finally {
        setChecking(false)
      }
    },
    [finishOrAdvance],
  )

  const handleSequenceComplete = useCallback(() => {
    if (!sequenceLiveRef.current) return
    const ids = selectedIdsRef.current
    if (ids.length > 0) {
      void resolveSelection(ids)
      return
    }
    void skipMissed()
  }, [resolveSelection, skipMissed])

  const handleContinue = () => {
    const ids = selectedIdsRef.current
    if (ids.length === 0 || checking || result) return
    setSequenceLive(false)
    void resolveSelection(ids)
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <PageNavbar
          title={`Épreuve ${examNumber}`}
          icon={ShieldCheck}
          onBack={() => navigation.navigate('ECodePermis')}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>E-Codepermis</Text>
          <Text style={styles.title}>Épreuve {examNumber}</Text>
          <Text style={styles.subtitle}>
            Note en direct : {liveCorrect}/{attempt?.total ?? 20} · Seuil{' '}
            {attempt?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {finished && finalScore ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {finalScore.passed ? 'Épreuve réussie' : 'Épreuve non réussie'}
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
              {sequenceLive && !result && question.prompt?.audioUrl ? (
                <QuestionAudioSequence
                  questionKey={question.id}
                  promptUri={resolveMediaUrl(question.prompt?.audioUrl)}
                  onSequenceComplete={handleSequenceComplete}
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

              {!result && selectedIds.length > 0 ? (
                <Pressable
                  style={[styles.primaryBtn, checking && styles.primaryBtnDisabled]}
                  disabled={checking}
                  onPress={handleContinue}
                >
                  {checking ? (
                    <ActivityIndicator color={'#0B0F1A'} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Continuer</Text>
                  )}
                </Pressable>
              ) : null}
              {!result && selectedIds.length === 0 ? (
                <Text style={styles.awaitingText}>
                  L’audio démarre tout seul. Cochez puis Continuer pour passer sans décompte.
                </Text>
              ) : null}
              {result ? <Text style={styles.awaitingText}>Passage automatique…</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingBottom: 28 },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginBottom: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: dark.greenSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: dark.border,
  },
  bannerItem: { flex: 1 },
  bannerValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  bannerLabel: { fontFamily: fonts.body, fontSize: 12, color: dark.textMuted },
  notesLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
  },
  notesLinkText: {
    fontFamily: fonts.bodyBold,
    color: dark.textPrimary,
    fontSize: 13,
  },
  lockedBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    gap: 12,
  },
  lockedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  emptyBox: {
    marginTop: 8,
    marginBottom: 4,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  revisionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  revisionBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
  },
  status_available: {},
  status_in_progress: {
    backgroundColor: dark.coralSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  status_completed: {
    backgroundColor: dark.greenSoft,
    borderColor: 'rgba(34,214,115,0.35)',
  },
  examTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  examMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  disabled: { opacity: 0.5 },
  empty: {
    fontFamily: fonts.body,
    color: dark.textMuted,
    marginBottom: 12,
  },
  error: { color: dark.coral, marginBottom: 10, fontFamily: fonts.body },
  ok: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    marginBottom: 10,
  },
  quizBox: { gap: 10 },
  progress: {
    fontFamily: fonts.bodyBold,
    color: dark.textMuted,
    marginBottom: 4,
  },
  prompt: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  answer: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: dark.surfaceRaised,
  },
  answerSelected: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  answerCorrect: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  answerWrong: {
    borderColor: dark.coral,
    backgroundColor: dark.coralSoft,
  },
  answerLabel: {
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
  },
  answerMeta: {
    marginTop: 4,
    fontSize: 13,
    color: dark.textMuted,
    fontFamily: fonts.body,
  },
  resultBox: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
    gap: 12,
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  resultScore: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.green,
  },
  awaitingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
})
