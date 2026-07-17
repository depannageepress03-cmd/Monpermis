import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, Circle, ClipboardList, HelpCircle, X } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
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
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestions'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestions'>

export function ChapterQuestionsScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, mode = 'practice' } = route.params
  const isTest = mode === 'test'

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

  useEffect(() => {
    void import('expo-audio')
      .then((audio) => audio.setAudioModeAsync({ playsInSilentMode: true }))
      .catch(() => undefined)
  }, [])

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    setError(null)
    try {
      const list = isTest
        ? await fetchChapterTestSubject(chapterId)
        : await fetchChapterQuestions(chapterId)
      setQuestions(list)
      setIndex(0)
      setSelectedIds(new Set())
      setResult(null)
      setScore({ correct: 0, total: 0 })
      setFinished(false)
      setTestSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }, [chapterId, isTest])

  useFocusEffect(
    useCallback(() => {
      if (user) void loadQuestions()
    }, [user, loadQuestions]),
  )

  const question = questions[index]

  const toggleAnswer = (answerId: string) => {
    if (result) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(answerId)) next.delete(answerId)
      else next.add(answerId)
      return next
    })
  }

  const onValidate = async () => {
    if (!question || selectedIds.size === 0 || checking) return
    setChecking(true)
    try {
      const check = await checkQuestionAnswers(chapterId, question.id, [...selectedIds])
      setResult(check)
      setScore((prev) => ({
        correct: prev.correct + (check.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }

  const onNext = async () => {
    if (index >= questions.length - 1) {
      setFinished(true)
      if (isTest && !testSaved) {
        setSavingTest(true)
        try {
          const nextScore = score
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
    setIndex((prev) => prev + 1)
    setSelectedIds(new Set())
    setResult(null)
  }

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <PageNavbar
          title={chapterName}
          icon={isTest ? ClipboardList : HelpCircle}
          onBack={() => navigation.goBack()}
          numberOfLines={2}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>{isTest ? 'Sujet test' : 'Questions'}</Text>
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
            <View style={styles.centerBox}>
              <ActivityIndicator color={dark.green} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Erreur</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable style={styles.primaryBtn} onPress={() => void loadQuestions()}>
                <Text style={styles.primaryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : questions.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>
                {isTest ? 'Aucun sujet test' : 'Aucune question'}
              </Text>
              <Text style={styles.emptyText}>
                {isTest
                  ? 'Aucun sujet test publié pour ce chapitre. Demandez à votre auto-école de le générer et de le publier.'
                  : 'Les questions publiées de ce chapitre apparaîtront ici.'}
              </Text>
            </View>
          ) : finished ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Terminé</Text>
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
              <Pressable style={styles.primaryBtn} onPress={() => void loadQuestions()}>
                <Text style={styles.primaryBtnText}>Recommencer</Text>
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
              <Text style={styles.progress}>
                Question {index + 1} / {questions.length}
              </Text>

              <View style={styles.promptCard}>
                <Text style={styles.promptLabel}>Énonce</Text>
                {question.prompt.text ? (
                  <Text style={styles.promptText}>{question.prompt.text}</Text>
                ) : null}
                {question.prompt.audioUrl || question.answers.some((a) => a.audioUrl) ? (
                  <QuestionAudioSequence
                    questionKey={question.id}
                    promptUri={resolveMediaUrl(question.prompt.audioUrl)}
                    answerUris={question.answers.map((a) => resolveMediaUrl(a.audioUrl))}
                  />
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
                    disabled={Boolean(result)}
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

              {!result ? (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (selectedIds.size === 0 || checking) && styles.primaryBtnDisabled,
                  ]}
                  disabled={selectedIds.size === 0 || checking}
                  onPress={() => void onValidate()}
                >
                  {checking ? (
                    <ActivityIndicator color={'#0B0F1A'} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Valider</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={onNext}>
                  <Text style={styles.primaryBtnText}>
                    {index >= questions.length - 1 ? 'Voir le score' : 'Question suivante'}
                  </Text>
                </Pressable>
              )}
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
})
