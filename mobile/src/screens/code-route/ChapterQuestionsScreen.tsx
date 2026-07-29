import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, Circle, ClipboardList, HelpCircle, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  checkQuestionAnswers,
  fetchChapterQuestions,
  fetchChapterTestSubject,
  markChapterTestCompleted,
  type RevisionQuestion,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { PageNavbar } from '../../components/PageNavbar'
import { ProgressBar } from '../../components/ProgressBar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { hapticError, hapticSelect, hapticSuccess } from '../../utils/haptics'
import { playFailSound, playSuccessSound, stopAllQuizAudio } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestions'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestions'>

type ReviewEntry = {
  question: RevisionQuestion
  selectedIds: string[]
  correctAnswerIds: string[]
  isCorrect: boolean
}

function progressColor(ratio: number) {
  if (ratio < 0.34) return dark.coral
  if (ratio < 0.67) return '#F0B429'
  return dark.green
}

export function ChapterQuestionsScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, mode = 'practice', subjectNumber: subjectNumberParam } = route.params
  const isTest = mode === 'test'
  const subjectNumber = Math.max(1, Number(subjectNumberParam) || 1)

  const [subjectLabel, setSubjectLabel] = useState(isTest ? `Sujet ${subjectNumber}` : '')
  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    correctAnswerIds: string[]
  } | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [finished, setFinished] = useState(false)
  const [savingTest, setSavingTest] = useState(false)
  const [testSaved, setTestSaved] = useState(false)
  const [sequenceLive, setSequenceLive] = useState(true)
  const [audioPaused, setAudioPaused] = useState(false)
  const [reviewHistory, setReviewHistory] = useState<ReviewEntry[]>([])
  const [reviewing, setReviewing] = useState(false)

  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const resultRef = useRef(result)
  resultRef.current = result
  const checkingRef = useRef(checking)
  checkingRef.current = checking
  const indexRef = useRef(index)
  indexRef.current = index
  const questionsRef = useRef(questions)
  questionsRef.current = questions
  const scoreRef = useRef(score)
  scoreRef.current = score
  const testSavedRef = useRef(testSaved)
  testSavedRef.current = testSaved
  const sequenceLiveRef = useRef(sequenceLive)
  sequenceLiveRef.current = sequenceLive

  useEffect(() => {
    void import('../../utils/audioSession').then((m) => m.ensureAudioSession())
  }, [])

  const loadQuestions = useCallback(async () => {
    stopAllQuizAudio()
    setLoadingQuestions(true)
    setError(null)
    try {
      if (isTest) {
        const subject = await fetchChapterTestSubject(chapterId, subjectNumber)
        setSubjectLabel(subject.label || `Sujet ${subjectNumber}`)
        setQuestions(subject.questions || [])
      } else {
        setSubjectLabel('')
        setQuestions(await fetchChapterQuestions(chapterId))
      }
      setIndex(0)
      setSelectedIds(new Set())
      setResult(null)
      setScore({ correct: 0, total: 0 })
      setFinished(false)
      setTestSaved(false)
      setSequenceLive(true)
      setReviewHistory([])
      setReviewing(false)
      setAudioPaused(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }, [chapterId, isTest, subjectNumber])

  useFocusEffect(
    useCallback(() => {
      if (user) void loadQuestions()
    }, [user, loadQuestions]),
  )

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds(new Set())
    setResult(null)
    setAudioPaused(false)
    stopAllQuizAudio()
  }, [index])

  useEffect(() => {
    if (finished) stopAllQuizAudio()
  }, [finished])

  useEffect(() => {
    if (finished || result || checking) return
    if (selectedIds.size > 0) {
      setSequenceLive(false)
      stopAllQuizAudio()
    } else {
      setSequenceLive(true)
    }
  }, [selectedIds, finished, result, checking])

  const question = questions[index]

  const finishOrAdvance = useCallback(
    async (nextScore: { correct: number; total: number }) => {
      const currentIndex = indexRef.current
      const list = questionsRef.current
      if (currentIndex >= list.length - 1) {
        stopAllQuizAudio()
        setSequenceLive(false)
        setFinished(true)
        if (isTest && !testSavedRef.current) {
          setSavingTest(true)
          try {
            await markChapterTestCompleted(chapterId, nextScore.correct, nextScore.total)
            setTestSaved(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation du test impossible')
          } finally {
            setSavingTest(false)
          }
        }
        return
      }
      stopAllQuizAudio()
      setIndex((prev) => prev + 1)
      setSelectedIds(new Set())
      setResult(null)
      setSequenceLive(true)
    },
    [chapterId, isTest],
  )

  const skipMissed = useCallback(async () => {
    if (checkingRef.current || resultRef.current) return
    setChecking(true)
    setSequenceLive(false)
    stopAllQuizAudio()
    try {
      const currentQuestion = questionsRef.current[indexRef.current]
      setResult({ isCorrect: false, correctAnswerIds: [] })
      if (currentQuestion) {
        setReviewHistory((prev) => [
          ...prev,
          {
            question: currentQuestion,
            selectedIds: [],
            correctAnswerIds: [],
            isCorrect: false,
          },
        ])
      }
      const nextScore = {
        correct: scoreRef.current.correct,
        total: scoreRef.current.total + 1,
      }
      setScore(nextScore)
      void hapticError()
      void playFailSound()
      await finishOrAdvance(nextScore)
    } finally {
      setChecking(false)
    }
  }, [finishOrAdvance])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentQuestion = questionsRef.current[indexRef.current]
      if (!currentQuestion || ids.length === 0 || checkingRef.current || resultRef.current) return

      setChecking(true)
      setSequenceLive(false)
      stopAllQuizAudio()
      try {
        const check = await checkQuestionAnswers(chapterId, currentQuestion.id, ids)
        setResult(check)
        setReviewHistory((prev) => [
          ...prev,
          {
            question: currentQuestion,
            selectedIds: ids,
            correctAnswerIds: check.correctAnswerIds || [],
            isCorrect: check.isCorrect,
          },
        ])
        const nextScore = {
          correct: scoreRef.current.correct + (check.isCorrect ? 1 : 0),
          total: scoreRef.current.total + 1,
        }
        setScore(nextScore)
        if (check.isCorrect) {
          void hapticSuccess()
          await playSuccessSound()
        } else {
          void hapticError()
          await playFailSound()
        }
        await wait(900)
        await finishOrAdvance(nextScore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vérification impossible')
        setSequenceLive(selectedIdsRef.current.size === 0)
      } finally {
        setChecking(false)
      }
    },
    [chapterId, finishOrAdvance],
  )

  const handleSequenceComplete = useCallback(() => {
    if (!sequenceLiveRef.current) return
    const ids = [...selectedIdsRef.current]
    if (ids.length > 0) {
      void resolveSelection(ids)
      return
    }
    void skipMissed()
  }, [resolveSelection, skipMissed])

  const handleContinue = () => {
    const ids = [...selectedIdsRef.current]
    if (ids.length === 0 || checking || result) return
    setSequenceLive(false)
    stopAllQuizAudio()
    void resolveSelection(ids)
  }

  const toggleAnswer = (answerId: string) => {
    if (result || checking) return
    void hapticSelect()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(answerId)) next.delete(answerId)
      else next.add(answerId)
      return next
    })
  }

  if (loading || !user) return <ScreenLoader />

  const ratio = questions.length > 0 ? (index + (finished ? 1 : 0)) / questions.length : 0

  return (
    <DarkScreen>
        <ConfettiBurst active={finished && score.total > 0 && score.correct / score.total >= 0.7} />
        <PageNavbar
          title={chapterName}
          icon={isTest ? ClipboardList : HelpCircle}
          onBack={() => navigation.goBack()}
          numberOfLines={2}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {
            if (sequenceLive && !result) {
              setAudioPaused(true)
              stopAllQuizAudio()
            }
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>{isTest ? subjectLabel || 'Sujet test' : 'Questions'}</Text>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
            {isTest ? (
              <Text style={styles.subtitle}>
                Évaluation du chapitre — 20 questions tirées au hasard
              </Text>
            ) : null}
          </View>

          {loadingQuestions ? (
            <SkeletonList count={3} />
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Erreur</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable style={styles.primaryBtn} onPress={() => void loadQuestions()}>
                <Text style={styles.primaryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={30} color={dark.textMuted} />}
              title={isTest ? 'Aucun sujet test' : 'Aucune question'}
              message={
                isTest
                  ? 'Aucune question publiée pour ce chapitre.'
                  : 'Les questions publiées de ce chapitre apparaîtront ici.'
              }
            />
          ) : reviewing ? (
            <View style={styles.reviewWrap}>
              <Text style={styles.emptyTitle}>Mode correction</Text>
              <Text style={styles.emptyText}>
                {score.correct}/{score.total} — revois tes réponses et les bonnes.
              </Text>
              {reviewHistory.map((entry, reviewIndex) => (
                <View key={`${entry.question.id}-${reviewIndex}`} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.progress}>
                      Q{reviewIndex + 1}
                      {entry.isCorrect ? ' · Correct' : ' · Incorrect'}
                    </Text>
                    {entry.isCorrect ? (
                      <Check size={18} color={dark.green} />
                    ) : (
                      <X size={18} color={dark.coral} />
                    )}
                  </View>
                  {entry.question.prompt.text ? (
                    <Text style={styles.promptText}>{entry.question.prompt.text}</Text>
                  ) : null}
                  {entry.question.answers.map((answer) => {
                    const wasSelected = entry.selectedIds.includes(answer.id)
                    const isGood = entry.correctAnswerIds.includes(answer.id)
                    return (
                      <View
                        key={answer.id}
                        style={[
                          styles.answerRow,
                          isGood && styles.answerCorrect,
                          wasSelected && !isGood && styles.answerWrong,
                        ]}
                      >
                        <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                        {answer.text ? <Text style={styles.answerText}>{answer.text}</Text> : null}
                        <Text style={styles.reviewHint}>
                          {isGood ? 'Bonne réponse' : wasSelected ? 'Ta réponse' : ''}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              ))}
              <Pressable style={styles.primaryBtn} onPress={() => setReviewing(false)}>
                <Text style={styles.primaryBtnText}>Retour au score</Text>
              </Pressable>
            </View>
          ) : finished ? (
            <View style={styles.centerBox}>
              <AnimatedCheckmark
                active
                color={
                  score.total > 0 && score.correct / score.total >= 0.5 ? dark.green : dark.coral
                }
              />
              <Text style={[styles.emptyTitle, { marginTop: 16 }]}>
                {score.total > 0 && score.correct / score.total >= 0.7
                  ? 'Bravo !'
                  : score.total > 0 && score.correct / score.total >= 0.5
                    ? 'Bien joué'
                    : 'Terminé'}
              </Text>
              <Text style={styles.scoreText}>
                {score.correct} / {score.total} bonne{score.total > 1 ? 's' : ''} réponse
                {score.total > 1 ? 's' : ''}
              </Text>
              {isTest ? (
                <Text style={styles.emptyText}>
                  {savingTest
                    ? 'Enregistrement du sujet test…'
                    : testSaved
                      ? 'Sujet test validé — le chapitre suivant est débloqué.'
                      : 'Sujet test terminé.'}
                </Text>
              ) : null}
              {reviewHistory.length > 0 ? (
                <Pressable style={styles.primaryBtn} onPress={() => setReviewing(true)}>
                  <Text style={styles.primaryBtnText}>Mode correction</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={() => void loadQuestions()}>
                <Text style={styles.secondaryBtnText}>Recommencer</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('RevisionChapitres')}
              >
                <Text style={styles.secondaryBtnText}>Retour aux chapitres</Text>
              </Pressable>
            </View>
          ) : question ? (
            <View>
              <View style={styles.progressBlock}>
                <Text style={styles.progress}>
                  Question {index + 1} / {questions.length}
                </Text>
                <ProgressBar progress={ratio} color={progressColor(ratio)} height={10} />
              </View>

              <View style={styles.promptCard}>
                <Text style={styles.promptLabel}>Énonce</Text>
                {question.prompt.text ? (
                  <Text style={styles.promptText}>{question.prompt.text}</Text>
                ) : null}
                {sequenceLive && !result && !audioPaused && question.prompt.audioUrl ? (
                  <QuestionAudioSequence
                    questionKey={question.id}
                    promptUri={resolveMediaUrl(question.prompt.audioUrl)}
                    onSequenceComplete={handleSequenceComplete}
                  />
                ) : null}
                {audioPaused && sequenceLive && !result ? (
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setAudioPaused(false)
                      setSequenceLive(true)
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>Reprendre l’audio</Text>
                  </Pressable>
                ) : null}
                {question.prompt.imageUrls.length > 0 ? (
                  <View style={styles.images}>
                    {question.prompt.imageUrls.map((url) => {
                      const src = resolveMediaUrl(url)
                      if (!src) return null
                      return (
                        <Image
                          key={url}
                          source={{ uri: src }}
                          style={styles.image}
                          resizeMode="contain"
                        />
                      )
                    })}
                  </View>
                ) : null}
              </View>

              <Text style={styles.answersTitle}>Choisissez la ou les bonnes réponses</Text>

              {question.answers.map((answer) => {
                const selected = selectedIds.has(answer.id)
                const isCorrectAnswer = result?.correctAnswerIds.includes(answer.id)
                const showCorrect = Boolean(result && isCorrectAnswer)
                const showWrong = Boolean(result && selected && !isCorrectAnswer)

                return (
                  <Pressable
                    key={answer.id}
                    style={[
                      styles.answerRow,
                      selected && !result && styles.answerSelected,
                      showCorrect && styles.answerCorrect,
                      showWrong && styles.answerWrong,
                    ]}
                    onPress={() => toggleAnswer(answer.id)}
                    disabled={Boolean(result) || checking}
                  >
                    <View style={styles.answerLeft}>
                      {selected ? (
                        <Check size={18} color={showWrong ? dark.coral : dark.green} />
                      ) : (
                        <Circle size={18} color={dark.textMuted} />
                      )}
                      <View style={styles.answerCopy}>
                        <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                        {answer.text ? (
                          <Text style={styles.answerText}>{answer.text}</Text>
                        ) : null}
                      </View>
                    </View>
                    {showWrong ? <X size={18} color={dark.coral} /> : null}
                  </Pressable>
                )
              })}

              {result ? (
                <View
                  style={[
                    styles.feedback,
                    result.isCorrect ? styles.feedbackOk : styles.feedbackKo,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      result.isCorrect ? styles.feedbackTextOk : styles.feedbackTextKo,
                    ]}
                  >
                    {result.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
                  </Text>
                </View>
              ) : null}

              {!result && selectedIds.size > 0 ? (
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
              {!result && selectedIds.size === 0 ? (
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
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    marginTop: 4,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  accent: {
    height: 4,
    borderRadius: 999,
  },
  accentGreen: {
    width: 28,
    backgroundColor: dark.green,
  },
  accentGold: {
    width: 18,
    backgroundColor: dark.coral,
  },
  accentNavy: {
    width: 12,
    backgroundColor: dark.textMuted,
  },
  progress: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  progressBlock: {
    gap: 10,
    marginBottom: 16,
  },
  reviewWrap: {
    gap: 12,
    paddingBottom: 20,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    gap: 8,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
    marginTop: 4,
  },
  promptCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  promptLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: dark.coral,
  },
  promptText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textPrimary,
  },
  images: {
    gap: 10,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: dark.surfaceRaised,
  },
  answersTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surfaceRaised,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  answerSelected: {
    borderColor: 'rgba(34,214,115,0.45)',
    backgroundColor: dark.greenSoft,
  },
  answerCorrect: {
    borderColor: 'rgba(34,214,115,0.55)',
    backgroundColor: dark.greenSoft,
  },
  answerWrong: {
    borderColor: dark.coral,
    backgroundColor: dark.coralSoft,
  },
  answerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  answerCopy: {
    flex: 1,
    gap: 2,
  },
  answerLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  answerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textPrimary,
  },
  feedback: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  feedbackOk: {
    backgroundColor: dark.greenSoft,
  },
  feedbackKo: {
    backgroundColor: dark.coralSoft,
  },
  feedbackText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  feedbackTextOk: {
    color: dark.green,
  },
  feedbackTextKo: {
    color: dark.coral,
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
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: dark.surface,
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.green,
    marginBottom: 20,
  },
  awaitingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
})
