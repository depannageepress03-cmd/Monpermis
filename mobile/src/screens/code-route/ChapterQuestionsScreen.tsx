import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Square,
  SquareCheck,
  Trophy,
  X,
} from 'lucide-react-native'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  checkQuestionAnswers,
  fetchChapterQuestions,
  fetchChapterTestSubject,
  markChapterTestCompleted,
  type RevisionQuestion,
} from '../../api/revision'
import { EmptyState } from '../../components/EmptyState'
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark'
import { Bouncy } from '../../components/Bouncy'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { ScreenLoader } from '../../components/ScreenLoader'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { QuestionPromptHtml } from '../../components/QuestionPromptHtml'
import { SkeletonList } from '../../components/Skeleton'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useOffline } from '../../context/OfflineContext'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { hapticError, hapticSelect, hapticSuccess } from '../../utils/haptics'
import { playFailSound, playSuccessSound, stopAllQuizAudio } from '../../utils/quizSounds'
import { rememberChapterOrder } from '../../data/codeRoute/chapterIndex'
import { resolveQuestionImageUri } from '../../utils/questionImages'
import { tracker } from '../../tracking/tracker'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestions'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestions'>

type ReviewEntry = {
  question: RevisionQuestion
  selectedIds: string[]
  correctAnswerIds: string[]
  isCorrect: boolean
}

export function ChapterQuestionsScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { isOffline, enqueue } = useOffline()
  const {
    chapterId,
    chapterName,
    chapterOrder,
    mode = 'practice',
    subjectNumber: subjectNumberParam,
    questionIndex: questionIndexParam,
  } = route.params
  const isTest = mode === 'test'
  const subjectNumber = Math.max(1, Number(subjectNumberParam) || 1)
  const isSingleQuestion = !isTest && questionIndexParam != null

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
      rememberChapterOrder(chapterId, chapterOrder, chapterName)
      let loaded: RevisionQuestion[] = []
      if (isTest) {
        const subject = await fetchChapterTestSubject(chapterId, subjectNumber)
        setSubjectLabel(subject.label || `Sujet ${subjectNumber}`)
        loaded = subject.questions || []
        setQuestions(loaded)
      } else {
        setSubjectLabel('')
        const all = await fetchChapterQuestions(chapterId)
        if (questionIndexParam != null && questionIndexParam >= 0 && questionIndexParam < all.length) {
          loaded = [all[questionIndexParam]]
        } else {
          loaded = all
        }
        setQuestions(loaded)
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
      const startContext = {
        chapterId,
        subjectNumber: isTest ? subjectNumber : undefined,
        mode,
      }
      tracker.setActiveSession(startContext)
      const startEvent = isTest ? 'test_start' : 'practice_start'
      tracker.track(startEvent, startContext, { count: loaded.length })
      tracker.markQuestionStart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }, [chapterId, chapterOrder, chapterName, isTest, subjectNumber, mode, questionIndexParam])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void loadQuestions()
      return () => setStatusBarStyle('dark')
    }, [user, loadQuestions]),
  )

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds(new Set())
    setResult(null)
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

  const question = questions[index]
  const [resolvedImages, setResolvedImages] = useState<{ key: string; uri: string }[]>([])

  useEffect(() => {
    let cancelled = false
    const urls = question?.prompt?.imageUrls || []
    if (!question || urls.length === 0) {
      setResolvedImages([])
      return
    }
    ;(async () => {
      const next: { key: string; uri: string }[] = []
      for (const url of urls) {
        const uri = await resolveQuestionImageUri(question.id, url)
        if (uri) next.push({ key: url, uri })
      }
      if (!cancelled) setResolvedImages(next)
    })()
    return () => {
      cancelled = true
    }
  }, [question?.id, question?.prompt?.imageUrls])

  const finishOrAdvance = useCallback(
    async (nextScore: { correct: number; total: number }) => {
      const currentIndex = indexRef.current
      const list = questionsRef.current
      if (currentIndex >= list.length - 1) {
        stopAllQuizAudio()
        setSequenceLive(false)
        setFinished(true)
        const completeEvent = isTest ? 'test_complete' : 'practice_complete'
        tracker.track(
          completeEvent,
          {
            chapterId,
            subjectNumber: isTest ? subjectNumber : undefined,
            mode,
          },
          { correct: nextScore.correct, total: nextScore.total },
        )
        tracker.setActiveSession(null)
        if (isTest && !testSavedRef.current) {
          setSavingTest(true)
          try {
            if (isOffline) {
              await enqueue('markTestCompleted', {
                chapterId,
                correct: nextScore.correct,
                total: nextScore.total,
              })
            } else {
              await markChapterTestCompleted(chapterId, nextScore.correct, nextScore.total)
            }
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
    [chapterId, isTest, mode, subjectNumber],
  )

  const skipMissed = useCallback(async () => {
    if (checkingRef.current || resultRef.current) return
    setChecking(true)
    setSequenceLive(false)
    stopAllQuizAudio()
    try {
      const currentQuestion = questionsRef.current[indexRef.current]
      tracker.track(
        isTest ? 'test_skip' : 'practice_skip',
        {
          chapterId,
          subjectNumber: isTest ? subjectNumber : undefined,
          mode,
          questionId: currentQuestion?.id || '',
        },
        { index: indexRef.current, elapsedMs: tracker.consumeElapsedMs() },
      )
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
    } finally {
      setChecking(false)
    }
  }, [chapterId, isTest, mode, subjectNumber])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentQuestion = questionsRef.current[indexRef.current]
      if (!currentQuestion || ids.length === 0 || checkingRef.current || resultRef.current) return

      setChecking(true)
      setSequenceLive(false)
      stopAllQuizAudio()
      try {
        const check = await checkQuestionAnswers(chapterId, currentQuestion.id, ids)
        tracker.track(
          isTest ? 'test_answer' : 'practice_answer',
          {
            chapterId,
            subjectNumber: isTest ? subjectNumber : undefined,
            mode,
            questionId: currentQuestion.id,
          },
          {
            answerIds: ids,
            isCorrect: check.isCorrect,
            index: indexRef.current,
            elapsedMs: tracker.consumeElapsedMs(),
          },
        )
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vérification impossible')
        setSequenceLive(selectedIdsRef.current.size === 0)
      } finally {
        setChecking(false)
      }
    },
    [chapterId, isTest, mode, subjectNumber],
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

  useLeaveGuard(
    !finished && !loadingQuestions && questions.length > 0,
    score.total > 0
      ? `Quitter ? Vos ${score.total} réponses en cours ne seront pas sauvegardées comme un examen — recommencez si besoin.`
      : 'Quitter ? Votre progression de cette session ne sera pas conservée.',
  )

  const showQuizChrome =
    !loadingQuestions && !error && questions.length > 0 && !finished && !reviewing && Boolean(question)

  const canValidate = showQuizChrome && !result && selectedIds.size > 0 && !checking
  const canAdvance = showQuizChrome && Boolean(result)

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ConfettiBurst active={finished && score.total > 0 && score.correct / score.total >= 0.7} />

        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>

          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              {isTest ? (
                <ClipboardList size={15} color={dark.green} />
              ) : (
                <HelpCircle size={15} color={dark.green} />
              )}
            </View>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {isTest ? subjectLabel || 'Sujet test' : 'Questions'}
            </Text>
          </View>

          {finished ? (
            <View style={styles.roundBtn}>
              <Trophy size={18} color={dark.green} />
            </View>
          ) : (
            <View style={styles.roundBtnSpacer} accessibilityElementsHidden />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            showQuizChrome && styles.scrollWithBar,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!showQuizChrome && !reviewing && !finished ? (
            <FadeUp delay={40}>
              <View style={styles.header}>
                <Text style={styles.kicker}>{isTest ? 'Sujet test' : 'Entraînement'}</Text>
                <Text style={styles.modeTitle}>
                  {isTest ? subjectLabel || 'Évaluation' : 'Questions'}
                </Text>
                {isTest ? (
                  <Text style={styles.subtitle}>
                    Évaluation du chapitre — répondez à chaque question à votre rythme.
                  </Text>
                ) : (
                  <Text style={styles.subtitle}>
                    Cochez la ou les bonnes réponses, puis validez.
                  </Text>
                )}
              </View>
            </FadeUp>
          ) : null}

          {loadingQuestions ? (
            <SkeletonList count={3} />
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Erreur</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable style={styles.inlinePrimary} onPress={() => void loadQuestions()}>
                <Text style={styles.inlinePrimaryText}>Réessayer</Text>
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
                    <Text style={styles.progressLabel}>
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
                    <QuestionPromptHtml text={entry.question.prompt.text} style={styles.promptText} />
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
              <Pressable style={styles.inlinePrimary} onPress={() => setReviewing(false)}>
                <Text style={styles.inlinePrimaryText}>Retour au score</Text>
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
                      ? 'Sujet test enregistré. Vous pouvez recommencer ou passer à un autre chapitre.'
                      : 'Sujet test terminé.'}
                </Text>
              ) : null}
              {reviewHistory.length > 0 ? (
                <Pressable style={styles.inlinePrimary} onPress={() => setReviewing(true)}>
                  <Text style={styles.inlinePrimaryText}>Mode correction</Text>
                </Pressable>
              ) : null}
              {isSingleQuestion ? (
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate('ChapterQuestionsList', { chapterId, chapterName, chapterOrder })}
                >
                  <Text style={styles.secondaryBtnText}>Retour à la liste</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable style={styles.secondaryBtn} onPress={() => void loadQuestions()}>
                    <Text style={styles.secondaryBtnText}>Recommencer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => navigation.navigate('RevisionChapitres')}
                  >
                    <Text style={styles.secondaryBtnText}>Retour aux chapitres</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : question ? (
            <FadeUp delay={80}>
              {(question.correctCount ?? 1) > 1 ? (
                <Text style={styles.multiBadge}>
                  {question.correctCount} bonnes réponses à cocher
                </Text>
              ) : null}

              {sequenceLive && !result ? (
                <View style={styles.audioWrap}>
                  <QuestionAudioSequence
                    questionKey={question.id}
                    promptUri={question.prompt?.audioUrl}
                    onSequenceComplete={handleSequenceComplete}
                  />
                </View>
              ) : null}

              {resolvedImages.length > 0 ? (
                <View style={styles.images}>
                  {resolvedImages.map((img) => (
                    <Image
                      key={img.key}
                      source={{ uri: img.uri }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              ) : null}

              {question.prompt.text ? (
                <View style={styles.promptTextCard}>
                  <QuestionPromptHtml text={question.prompt.text} style={styles.promptText} />
                </View>
              ) : null}

              <Text style={styles.answersTitle}>Choisissez la ou les bonnes réponses</Text>
              {!result ? (
                <Text style={styles.hintText}>
                  Audio : 2 lectures. Vous pouvez cocher pendant la lecture.
                </Text>
              ) : null}

              {question.answers.map((answer) => {
                const selected = selectedIds.has(answer.id)
                const isCorrectAnswer = result?.correctAnswerIds.includes(answer.id)
                const showCorrect = Boolean(result && isCorrectAnswer)
                const showWrong = Boolean(result && selected && !isCorrectAnswer)

                return (
                  <Pressable
                    key={answer.id}
                    style={({ pressed }) => [
                      styles.answerRow,
                      selected && !result && styles.answerSelected,
                      showCorrect && styles.answerCorrect,
                      showWrong && styles.answerWrong,
                      pressed && !result && !checking && styles.answerPressed,
                    ]}
                    onPress={() => toggleAnswer(answer.id)}
                    disabled={Boolean(result) || checking}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={styles.answerLeft}>
                      {selected ? (
                        <SquareCheck
                          size={24}
                          color={showWrong ? dark.coral : dark.green}
                        />
                      ) : (
                        <Square size={24} color="rgba(0,16,48,0.28)" />
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
            </FadeUp>
          ) : null}

          <LegalFooter />
        </ScrollView>

        {showQuizChrome ? (
          <View style={styles.bottomBar}>
            {canAdvance ? (
              <Bouncy
                scaleTo={0.98}
                style={styles.validateFlex}
                onPress={() => void finishOrAdvance(score)}
              >
                <View style={styles.validateBtn}>
                  <Text style={styles.validateBtnText}>
                    {index + 1 >= questions.length ? 'Voir le score' : 'Question suivante'}
                  </Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </View>
              </Bouncy>
            ) : (
              <Bouncy
                scaleTo={0.98}
                style={styles.validateFlex}
                disabled={!canValidate}
                onPress={handleContinue}
              >
                <View style={[styles.validateBtn, !canValidate && styles.validateBtnDisabled]}>
                  {checking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.validateBtnText}>Valider</Text>
                  )}
                </View>
              </Bouncy>
            )}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  roundBtnSpacer: {
    width: 44,
    height: 44,
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
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: dark.textPrimary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollWithBar: {
    paddingBottom: 110,
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: dark.green,
    marginBottom: 6,
  },
  modeTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 38,
    color: dark.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: dark.textMuted,
    marginTop: 8,
  },
  progressLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.textMuted,
  },
  multiBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: dark.greenSoft,
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    overflow: 'hidden',
  },
  promptTextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    ...shadows.sm,
  },
  promptText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textPrimary,
  },
  audioWrap: {
    marginBottom: 10,
  },
  images: {
    gap: 8,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  answersTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 4,
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 52,
    ...shadows.sm,
  },
  answerSelected: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  answerCorrect: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  answerWrong: {
    borderColor: dark.coral,
    backgroundColor: dark.coralSoft,
  },
  answerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  answerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  answerCopy: {
    flex: 1,
    gap: 2,
  },
  answerLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  answerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textPrimary,
  },
  reviewWrap: {
    gap: 12,
    paddingBottom: 20,
  },
  reviewCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
    ...shadows.sm,
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
  feedback: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    ...shadows.md,
  },
  validateFlex: {
    flex: 1,
  },
  validateBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: dark.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  validateBtnDisabled: {
    opacity: 0.4,
  },
  validateBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  inlinePrimary: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  inlinePrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'stretch',
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
  pressed: {
    opacity: 0.9,
  },
})
