import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
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
import {
  checkPracticeExamAnswer,
  completePracticeExam,
  ContentError,
  fetchPracticeExams,
  startPracticeExam,
  type PracticeExamAttempt,
  type PracticeExamsOverview,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { PageNavbar } from '../../components/PageNavbar'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { QuestionPromptHtml } from '../../components/QuestionPromptHtml'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { stopAllQuizAudio } from '../../utils/quizSounds'
import { tracker } from '../../tracking/tracker'

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

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load(true)
  })

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
    <DarkScreen>
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
              tintColor={dark.green}
            />
          }
        >
          <Text style={styles.kicker}>Auto-évaluation</Text>
          <Text style={styles.title}>Examens test</Text>
          <Text style={styles.subtitle}>
            {data?.examTotal ?? 24} sujets · mélange de tous les chapitres ·{' '}
            {data?.requiredSize ?? 20} questions · note /20 · moyenne {data?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
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

                  {data.exams.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>Examens en préparation</Text>
                      <Text style={styles.empty}>
                        {data.message ||
                          'Les examens test seront disponibles dès que ton auto-école aura publié les questions. Reviens bientôt !'}
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
                        <Text style={styles.examTitle}>Sujet {exam.examNumber}</Text>
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
      </DarkScreen>
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
  const [submitted, setSubmitted] = useState(false)
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
  const submittedRef = useRef(submitted)
  submittedRef.current = submitted
  const checkingRef = useRef(checking)
  checkingRef.current = checking
  const indexRef = useRef(index)
  indexRef.current = index
  const questionsRef = useRef<PracticeExamAttempt['questions']>([])
  const attemptRef = useRef(attempt)
  attemptRef.current = attempt
  const sequenceLiveRef = useRef(sequenceLive)
  sequenceLiveRef.current = sequenceLive

  useEffect(() => {
    void import('../../utils/audioSession').then((m) => m.ensureAudioSession())
  }, [])

  const load = useCallback(async () => {
    stopAllQuizAudio()
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startPracticeExam(examNumber)
      setAttempt(started)
      const answered = started.answeredCount || 0
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)))
      setSelectedIds([])
      setSubmitted(false)
      setAnsweredCount(answered)
      setFinished(started.status === 'completed')
      setSequenceLive(started.status !== 'completed')
      const baseContext = {
        attemptId: started.id,
        examNumber,
        examType: 'practice' as const,
      }
      if (started.status !== 'completed') {
        tracker.setActiveSession(baseContext)
        if (answered > 0) {
          tracker.track('exam_resume', baseContext, {
            answeredCount: answered,
            index: Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)),
          })
        } else {
          tracker.track('exam_start', baseContext, { answeredCount: 0 })
        }
        tracker.markQuestionStart()
      } else {
        tracker.setActiveSession(null)
      }
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
    setSubmitted(false)
    stopAllQuizAudio()
    tracker.markQuestionStart()
  }, [index])

  useEffect(() => {
    return () => {
      tracker.setActiveSession(null)
    }
  }, [])

  useEffect(() => {
    if (finished) stopAllQuizAudio()
  }, [finished])

  // Sélection d’une réponse : ne coupe PAS l’audio (2 lectures complètes jusqu’à Continuer / fin de séquence).

  const questions = attempt?.questions || []
  questionsRef.current = questions
  const question = questions[index]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `Question ${Math.min(index + 1, questions.length)} / ${questions.length}`
  }, [index, questions.length])

  const toggleAnswer = (answerId: string) => {
    if (submitted || checking) return
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
      stopAllQuizAudio()
      setSequenceLive(false)
      try {
        const { attempt: score } = await completePracticeExam(currentAttempt.id)
        tracker.track(
          'exam_complete',
          {
            attemptId: currentAttempt.id,
            examNumber,
            examType: 'practice',
          },
          {
            correct: score.correct,
            total: score.total,
            passed: score.passed,
            scoreLabel: score.scoreLabel,
          },
        )
        tracker.setActiveSession(null)
        setFinalScore(score)
        setFinished(true)
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Validation impossible')
      }
      return
    }
    stopAllQuizAudio()
    setIndex((value) => value + 1)
    setSelectedIds([])
    setSubmitted(false)
    setSequenceLive(true)
  }, [examNumber])

  const skipMissed = useCallback(async () => {
    const currentAttempt = attemptRef.current
    const currentQuestion = questionsRef.current[indexRef.current]
    if (
      !currentAttempt ||
      !currentQuestion ||
      checkingRef.current ||
      submittedRef.current
    )
      return

    setChecking(true)
    setSubmitted(true)
    setSequenceLive(false)
    stopAllQuizAudio()
    try {
      const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, [])
      tracker.track(
        'exam_skip',
        {
          attemptId: currentAttempt.id,
          examNumber,
          examType: 'practice',
          questionId: currentQuestion.id,
        },
        { index: indexRef.current, elapsedMs: tracker.consumeElapsedMs() },
      )
      setAnsweredCount(data.answeredCount)
      await finishOrAdvance()
    } catch (err) {
      setSubmitted(false)
      setError(err instanceof ContentError ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }, [examNumber, finishOrAdvance])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentAttempt = attemptRef.current
      const currentQuestion = questionsRef.current[indexRef.current]
      if (
        !currentAttempt ||
        !currentQuestion ||
        ids.length === 0 ||
        checkingRef.current ||
        submittedRef.current
      )
        return

      setChecking(true)
      setSubmitted(true)
      setSequenceLive(false)
      stopAllQuizAudio()
      try {
        const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, ids)
        tracker.track(
          'exam_answer',
          {
            attemptId: currentAttempt.id,
            examNumber,
            examType: 'practice',
            questionId: currentQuestion.id,
          },
          {
            answerIds: ids,
            isCorrect: data.isCorrect,
            index: indexRef.current,
            answeredCount: data.answeredCount,
            elapsedMs: tracker.consumeElapsedMs(),
          },
        )
        setAnsweredCount(data.answeredCount)
        await finishOrAdvance()
      } catch (err) {
        setSubmitted(false)
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
        setSequenceLive(selectedIdsRef.current.length === 0)
      } finally {
        setChecking(false)
      }
    },
    [examNumber, finishOrAdvance],
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
    if (ids.length === 0 || checking || submitted) return
    setSequenceLive(false)
    stopAllQuizAudio()
    void resolveSelection(ids)
  }

  const leaveMessage =
    answeredCount > 0
      ? `Quitter ? Vos ${answeredCount} réponses sont enregistrées — reprenez via Continuer sur la même épreuve.`
      : 'Quitter ? Votre progression en cours sera conservée si vous reprenez le même examen.'
  useLeaveGuard(Boolean(attempt) && !finished && !loading, leaveMessage, () => {
    const currentAttempt = attemptRef.current
    tracker.track(
      'exam_quit',
      {
        attemptId: currentAttempt?.id || '',
        examNumber,
        examType: 'practice',
      },
      {
        answeredCount,
        index: indexRef.current,
        elapsedMs: tracker.consumeElapsedMs(),
      },
    )
    tracker.setActiveSession(null)
  })

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <ConfettiBurst active={Boolean(finished && finalScore?.passed)} />
        <PageNavbar
          title={`Examen ${examNumber}`}
          icon={ClipboardCheck}
          onBack={() => navigation.navigate('ExamensTest')}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Examen blanc</Text>
          <Text style={styles.title}>Examen {examNumber}</Text>
          <Text style={styles.subtitle}>
            Seuil de réussite : {attempt?.passScore ?? 14}/20 · Résultats à la fin
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !finished && answeredCount > 0 ? (
            <Text style={styles.success}>
              Reprise à la question {Math.min(index + 1, attempt?.total || 20)} · {answeredCount}{' '}
              réponse{answeredCount > 1 ? 's' : ''} enregistrée{answeredCount > 1 ? 's' : ''}.
            </Text>
          ) : null}

          {finished && finalScore ? (
            <View style={styles.resultBox}>
              <AnimatedCheckmark active color={finalScore.passed ? dark.green : dark.coral} />
              <Text style={[styles.resultTitle, { marginTop: 12 }]}>
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
              <Text style={styles.progress}>{progressLabel}</Text>
              {(question.correctCount ?? 1) > 1 ? (
                <Text style={styles.multiBadge}>
                  {question.correctCount} bonnes réponses à cocher
                </Text>
              ) : null}
              {question.prompt?.text ? (
                <QuestionPromptHtml text={question.prompt.text} style={styles.prompt} />
              ) : null}
              {sequenceLive && !submitted ? (
                <QuestionAudioSequence
                  questionKey={question.id}
                  promptUri={question.prompt?.audioUrl}
                  offlineOnly
                  onSequenceComplete={handleSequenceComplete}
                />
              ) : null}
              {question.answers.map((answer) => {
                const selected = selectedIds.includes(answer.id)
                return (
                  <Pressable
                    key={answer.id}
                    style={[styles.answer, selected && styles.answerSelected]}
                    onPress={() => toggleAnswer(answer.id)}
                    disabled={submitted || checking}
                  >
                    <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                    {answer.text ? <Text style={styles.answerMeta}>{answer.text}</Text> : null}
                  </Pressable>
                )
              })}

              {!submitted && selectedIds.length > 0 ? (
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
              {!submitted && selectedIds.length === 0 ? (
                <Text style={styles.awaitingText}>
                  L’audio lit la question 2 fois. Vous pouvez cocher pendant la lecture ; Continuer valide sans attendre.
                </Text>
              ) : null}
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
  success: { color: dark.green, marginBottom: 10, fontFamily: fonts.body },
  multiBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    overflow: 'hidden',
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
