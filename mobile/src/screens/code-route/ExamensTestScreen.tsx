import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Lock,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  WifiOff,
  Zap,
} from 'lucide-react-native'
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
  type PracticeExamSummary,
} from '../../api/revision'
import { Bouncy } from '../../components/Bouncy'
import { DarkScreen } from '../../components/DarkScreen'
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { FadeUp } from '../../components/FadeUp'
import { PageNavbar } from '../../components/PageNavbar'
import { ProgressRing } from '../../components/ProgressRing'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { QuestionPromptHtml } from '../../components/QuestionPromptHtml'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonCard } from '../../components/Skeleton'
import {
  enrichAnswersFromTranscript,
  resolveQuestionTranscript,
} from '../../data/codeRoute/questionTranscripts'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, shadows } from '../../theme'
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

  const inProgress = data?.exams.find((exam) => exam.status === 'in_progress') ?? null
  const nextAvailable = data?.exams.find((exam) => exam.status === 'available') ?? null
  const resumeTarget = inProgress ?? nextAvailable
  const examTotal = data?.examTotal ?? 24
  const passedRatio = data && examTotal ? data.passedCount / examTotal : 0

  const actionLabel = (status: PracticeExamSummary['status']) =>
    status === 'completed' ? 'Repasser' : status === 'in_progress' ? 'Continuer' : 'Commencer'

  return (
    <DarkScreen>
      <PageNavbar
        title="Examens test"
        icon={ClipboardCheck}
        onBack={() => navigation.navigate('CodeRoute')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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
        {loading ? (
          <View>
            <SkeletonCard style={styles.skeletonHero} />
            <View style={styles.grid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} style={styles.skeletonTile} />
              ))}
            </View>
          </View>
        ) : null}

        {error && !loading ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <WifiOff size={20} color={dark.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Examens indisponibles</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable style={styles.retryBtn} onPress={() => void load()} hitSlop={8}>
              <RefreshCw size={16} color={dark.textPrimary} />
            </Pressable>
          </View>
        ) : null}

        {data && !loading ? (
          data.unlocked === false ? (
            <FadeUp delay={40}>
              <LinearGradient
                colors={['#F3F6FA', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.lockedBox}
              >
                <View style={styles.lockedIcon}>
                  <Lock size={26} color={dark.textPrimary} />
                </View>
                <Text style={styles.lockedTitle}>Examens test verrouillés</Text>
                <Text style={styles.lockedText}>
                  {data.message ||
                    'Termine tous les cours de chaque chapitre pour débloquer les examens test. Tu peux déjà répondre aux questions et passer le sujet test de chaque chapitre.'}
                </Text>
                <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('RevisionChapitres')}>
                  <View style={styles.revisionBtn}>
                    <Text style={styles.revisionBtnText}>Continuer la révision</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </View>
                </Bouncy>
              </LinearGradient>
            </FadeUp>
          ) : (
            <>
              <FadeUp delay={40}>
                <LinearGradient
                  colors={['#E8F8EF', '#F3FBF6', '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hero}
                >
                  <View style={styles.heroCopy}>
                    <View style={styles.heroKickerRow}>
                      <Sparkles size={13} color={dark.green} />
                      <Text style={styles.heroKicker}>Auto-évaluation</Text>
                    </View>
                    <Text style={styles.heroTitle}>Examens blancs</Text>
                    <Text style={styles.heroText}>
                      {examTotal} sujets · {data.requiredSize} questions · tous les chapitres
                    </Text>
                    <View style={styles.heroChips}>
                      <View style={styles.heroChip}>
                        <Target size={12} color={dark.green} />
                        <Text style={styles.heroChipText}>Seuil {data.passScore}/20</Text>
                      </View>
                      <View style={styles.heroChip}>
                        <Clock3 size={12} color={dark.green} />
                        <Text style={styles.heroChipText}>Audio ×2</Text>
                      </View>
                    </View>
                  </View>
                  <ProgressRing progress={passedRatio} size={100} stroke={10} delay={200}>
                    <Text style={styles.ringValue}>{data.passedCount}</Text>
                    <Text style={styles.ringLabel}>/{examTotal} réussis</Text>
                  </ProgressRing>
                </LinearGradient>
              </FadeUp>

              <FadeUp delay={90}>
                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue}>
                      {data.completedCount}
                      <Text style={styles.statTotal}>/{examTotal}</Text>
                    </Text>
                    <Text style={styles.statLabel}>passés</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={[styles.statValue, { color: dark.green }]}>{data.passedCount}</Text>
                    <Text style={styles.statLabel}>réussis</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={[styles.statValue, { color: dark.coral }]}>
                      {Math.max(0, data.completedCount - data.passedCount)}
                    </Text>
                    <Text style={styles.statLabel}>à retravailler</Text>
                  </View>
                  <Bouncy scaleTo={0.96} onPress={() => navigation.navigate('MesNotes')}>
                    <View style={styles.notesTile}>
                      <FileText size={18} color="#FFFFFF" />
                      <Text style={styles.notesTileText}>Mes notes</Text>
                    </View>
                  </Bouncy>
                </View>
              </FadeUp>

              {resumeTarget ? (
                <FadeUp delay={120}>
                  <Bouncy
                    scaleTo={0.98}
                    disabled={starting !== null || data.examCount === 0}
                    onPress={() => void handleStart(resumeTarget.examNumber)}
                  >
                    <LinearGradient
                      colors={inProgress ? ['#FF8A3D', '#F97316'] : ['#00D566', '#00A344']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.resumeCard}
                    >
                      <View style={styles.resumeIcon}>
                        {inProgress ? (
                          <PlayCircle size={24} color="#FFFFFF" />
                        ) : (
                          <Zap size={24} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.resumeKicker}>
                          {inProgress ? 'Reprendre où tu en étais' : 'Prochain sujet'}
                        </Text>
                        <Text style={styles.resumeTitle}>Sujet {resumeTarget.examNumber}</Text>
                        <Text style={styles.resumeMeta}>
                          {resumeTarget.questionCount} questions
                          {inProgress ? ' · en cours' : ' · disponible'}
                        </Text>
                      </View>
                      <View style={styles.resumeArrow}>
                        {starting === resumeTarget.examNumber ? (
                          <ActivityIndicator color={inProgress ? '#F97316' : dark.green} />
                        ) : (
                          <ArrowRight size={18} color={inProgress ? '#F97316' : dark.green} />
                        )}
                      </View>
                    </LinearGradient>
                  </Bouncy>
                </FadeUp>
              ) : null}

              {data.exams.length === 0 ? (
                <FadeUp delay={140}>
                  <View style={styles.emptyBox}>
                    <View style={styles.emptyIcon}>
                      <ClipboardCheck size={22} color={dark.green} />
                    </View>
                    <Text style={styles.emptyTitle}>Examens en préparation</Text>
                    <Text style={styles.emptyText}>
                      {data.message ||
                        'Les examens test seront disponibles dès que ton auto-école aura publié les questions. Reviens bientôt !'}
                    </Text>
                  </View>
                </FadeUp>
              ) : (
                <FadeUp delay={150}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Tous les sujets</Text>
                    <View style={styles.legendRow}>
                      <LegendDot color={dark.green} label="Réussi" />
                      <LegendDot color="#F97316" label="En cours" />
                      <LegendDot color={dark.coral} label="À revoir" />
                    </View>
                  </View>
                  {data.message ? <Text style={styles.notice}>{data.message}</Text> : null}
                </FadeUp>
              )}

              <View style={styles.grid}>
                {data.exams.map((exam, index) => {
                  const failed = exam.status === 'completed' && exam.score && !exam.score.passed
                  const passed = exam.status === 'completed' && exam.score?.passed
                  const live = exam.status === 'in_progress'
                  const accent = passed
                    ? dark.green
                    : failed
                      ? dark.coral
                      : live
                        ? '#F97316'
                        : dark.textPrimary
                  const accentSoft = passed
                    ? dark.greenSoft
                    : failed
                      ? dark.coralSoft
                      : live
                        ? '#FFF1E6'
                        : dark.surfaceRaised
                  const busy = starting === exam.examNumber
                  return (
                    <FadeUp key={exam.id} delay={160 + Math.min(index, 8) * 30} style={styles.tileWrap}>
                      <Bouncy
                        scaleTo={0.97}
                        disabled={busy || data.examCount === 0}
                        onPress={() => void handleStart(exam.examNumber)}
                      >
                        <View
                          style={[
                            styles.tile,
                            passed && styles.tilePass,
                            failed && styles.tileFail,
                            live && styles.tileLive,
                          ]}
                        >
                          <View style={styles.tileTop}>
                            <View style={[styles.tileIndex, { backgroundColor: accentSoft }]}>
                              <Text style={[styles.tileIndexText, { color: accent }]}>
                                {String(exam.examNumber).padStart(2, '0')}
                              </Text>
                            </View>
                            {passed ? (
                              <CheckCircle2 size={18} color={dark.green} />
                            ) : live ? (
                              <View style={styles.liveDotWrap}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>En cours</Text>
                              </View>
                            ) : failed ? (
                              <RotateCcw size={16} color={dark.coral} />
                            ) : null}
                          </View>

                          <Text style={styles.tileTitle}>Sujet {exam.examNumber}</Text>
                          <Text style={styles.tileMeta} numberOfLines={1}>
                            {exam.score
                              ? `${exam.score.scoreLabel} · ${exam.score.passed ? 'Réussi' : 'À revoir'}`
                              : `${exam.questionCount} questions`}
                          </Text>

                          <View
                            style={[
                              styles.tileBtn,
                              passed && styles.tileBtnGhost,
                              failed && styles.tileBtnFail,
                              live && styles.tileBtnLive,
                            ]}
                          >
                            {busy ? (
                              <ActivityIndicator
                                color={passed ? dark.textPrimary : '#FFFFFF'}
                                size="small"
                              />
                            ) : (
                              <>
                                <Text
                                  style={[styles.tileBtnText, passed && styles.tileBtnTextGhost]}
                                >
                                  {actionLabel(exam.status)}
                                </Text>
                                <ArrowRight
                                  size={14}
                                  color={passed ? dark.textPrimary : '#FFFFFF'}
                                />
                              </>
                            )}
                          </View>
                        </View>
                      </Bouncy>
                    </FadeUp>
                  )
                })}
              </View>
            </>
          )
        ) : null}
      </ScrollView>
    </DarkScreen>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
    // Pas de stopAllQuizAudio ici : coupe la nouvelle séquence au montage.
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
  const displayAnswers = useMemo(() => {
    if (!question) return []
    const transcript = resolveQuestionTranscript({
      id: question.id,
      order: question.order,
      prompt: question.prompt,
    })
    return enrichAnswersFromTranscript(question.answers, transcript)
  }, [question])
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
              {displayAnswers.map((answer) => {
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
  skeletonHero: { minHeight: 150, borderRadius: 26 },
  skeletonTile: { width: '48%', minHeight: 150, borderRadius: 20 },

  hero: {
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: dark.green,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.4,
    color: dark.textPrimary,
  },
  heroText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  heroChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: dark.textPrimary,
  },
  ringValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: dark.textPrimary,
    letterSpacing: -0.6,
  },
  ringLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: dark.textMuted,
    marginTop: -2,
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: dark.textPrimary,
  },
  statTotal: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    color: dark.textMuted,
    marginTop: 1,
  },
  notesTile: {
    height: '100%',
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: dark.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  notesTileText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
  },

  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    ...shadows.md,
  },
  resumeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeKicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  resumeTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  resumeMeta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  resumeArrow: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
  },
  legendRow: { flexDirection: 'row', gap: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 999 },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: dark.textMuted },
  notice: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    marginBottom: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tileWrap: { width: '48.4%' },
  tile: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: dark.border,
    padding: 14,
    gap: 4,
    minHeight: 158,
    ...shadows.sm,
  },
  tilePass: { borderColor: 'rgba(0,176,80,0.35)' },
  tileFail: { borderColor: 'rgba(232,93,59,0.35)' },
  tileLive: { borderColor: 'rgba(249,115,22,0.5)', backgroundColor: '#FFFBF7' },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tileIndex: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIndexText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  liveDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#F97316' },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: '#C2410C' },
  tileTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  tileMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
    marginBottom: 10,
  },
  tileBtn: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: dark.green,
  },
  tileBtnGhost: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  tileBtnFail: { backgroundColor: dark.coral },
  tileBtnLive: { backgroundColor: '#F97316' },
  tileBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  tileBtnTextGhost: { color: dark.textPrimary },

  emptyBox: {
    marginTop: 4,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: '#FFFFFF',
    gap: 6,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
  },

  lockedBox: {
    marginTop: 4,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: dark.border,
    gap: 10,
    alignItems: 'center',
  },
  lockedIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadows.sm,
  },
  lockedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  lockedText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  revisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  revisionBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: dark.coralSoft,
    marginBottom: 14,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.textPrimary },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: dark.textMuted,
    marginTop: 2,
  },
  retryBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startBtn: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
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
