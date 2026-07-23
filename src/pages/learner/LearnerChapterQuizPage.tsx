import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, HelpCircle } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  checkRevisionQuestionAnswers,
  ContentError,
  fetchRevisionChapterQuestions,
  fetchRevisionChapterTestSubject,
  fetchRevisionChapters,
  markRevisionTestCompleted,
  type LearnerQuestion,
} from '../../api/content'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { playFailSound, playSuccessSound } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Mode = 'practice' | 'test'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function LearnerChapterQuizPage({
  mode,
  backTo,
}: {
  mode: Mode
  backTo: (chapterId: string) => string
}) {
  const navigate = useNavigate()
  const { chapterId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || ''
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre')

  const [questions, setQuestions] = useState<LearnerQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    correctAnswerIds: string[]
  } | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [finished, setFinished] = useState(false)
  const [savingTest, setSavingTest] = useState(false)
  const [testSaved, setTestSaved] = useState(false)
  const [awaitingChoice, setAwaitingChoice] = useState(false)

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!stateChapterName) {
        const chapters = await fetchRevisionChapters()
        const chapterIndex = chapters.findIndex((item) => item.id === chapterId)
        if (chapterIndex >= 0) {
          setChapterName(`${chapterIndex + 1}. ${chapters[chapterIndex].name}`)
        }
      } else {
        setChapterName(stateChapterName)
      }
      const list =
        mode === 'test'
          ? await fetchRevisionChapterTestSubject(chapterId)
          : await fetchRevisionChapterQuestions(chapterId)
      setQuestions(list)
      setIndex(0)
      setSelectedIds([])
      setResult(null)
      setScore({ correct: 0, total: 0 })
      setFinished(false)
      setTestSaved(false)
      setAwaitingChoice(false)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [chapterId, mode, stateChapterName])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const question = questions[index]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `Question ${Math.min(index + 1, questions.length)} / ${questions.length}`
  }, [index, questions.length])

  const toggleAnswer = (answerId: string) => {
    if (result || checking) return
    setAwaitingChoice(false)
    setSelectedIds((current) =>
      current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId],
    )
  }

  const finishOrAdvance = useCallback(
    async (nextScore: { correct: number; total: number }) => {
      const currentIndex = indexRef.current
      const list = questionsRef.current
      if (currentIndex + 1 >= list.length) {
        setFinished(true)
        if (mode === 'test' && !testSavedRef.current) {
          setSavingTest(true)
          try {
            await markRevisionTestCompleted(chapterId, nextScore.correct, nextScore.total)
            setTestSaved(true)
          } catch (err) {
            setError(err instanceof ContentError ? err.message : 'Validation du test impossible')
          } finally {
            setSavingTest(false)
          }
        }
        return
      }
      setIndex((value) => value + 1)
      setSelectedIds([])
      setResult(null)
      setAwaitingChoice(false)
    },
    [chapterId, mode],
  )

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentQuestion = questionsRef.current[indexRef.current]
      if (!currentQuestion || ids.length === 0 || checkingRef.current || resultRef.current) return

      setChecking(true)
      setAwaitingChoice(false)
      try {
        const data = await checkRevisionQuestionAnswers(chapterId, currentQuestion.id, ids)
        setResult(data)
        const nextScore = {
          correct: scoreRef.current.correct + (data.isCorrect ? 1 : 0),
          total: scoreRef.current.total + 1,
        }
        setScore(nextScore)
        if (data.isCorrect) await playSuccessSound()
        else await playFailSound()
        await wait(900)
        await finishOrAdvance(nextScore)
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
      } finally {
        setChecking(false)
      }
    },
    [chapterId, finishOrAdvance],
  )

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault()
    await resolveSelection(selectedIdsRef.current)
  }

  const handleSequenceComplete = useCallback(() => {
    const ids = selectedIdsRef.current
    if (ids.length > 0) {
      void resolveSelection(ids)
      return
    }
    setAwaitingChoice(true)
  }, [resolveSelection])

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={mode === 'test' ? 'Sujet test' : 'Questions'}
          icon={mode === 'test' ? <ClipboardList size={22} /> : <HelpCircle size={22} />}
          onBack={() => navigate(backTo(chapterId))}
        />

        <header className="auth-header learner-header">
          <h1>{chapterName}</h1>
          <p>{mode === 'test' ? 'Évaluez-vous sur ce chapitre.' : 'Entraînez-vous aux questions.'}</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && !error && questions.length === 0 ? (
            <div className="learner-empty">
              <h2>{mode === 'test' ? 'Aucun sujet test' : 'Aucune question'}</h2>
              <p className="subtitle">
                {mode === 'test'
                  ? 'Aucun sujet test publié pour ce chapitre.'
                  : 'Aucune question publiée pour ce chapitre.'}
              </p>
            </div>
          ) : null}

          {!loading && !error && finished ? (
            <div className="learner-empty">
              <h2>Terminé</h2>
              <p className="subtitle">
                Score : {score.correct} / {score.total}
              </p>
              {mode === 'test' ? (
                <p className="subtitle">
                  {savingTest
                    ? 'Enregistrement du sujet test…'
                    : testSaved
                      ? 'Sujet test validé — le chapitre suivant est débloqué.'
                      : 'Sujet test terminé.'}
                </p>
              ) : null}
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Recommencer
              </button>
            </div>
          ) : null}

          {!loading && !error && question && !finished ? (
            <form onSubmit={handleCheck} className="learner-quiz">
              <p className="learner-quiz-progress">{progressLabel}</p>
              {question.prompt?.imageUrls?.length ? (
                <div className="learner-quiz-images">
                  {question.prompt.imageUrls.map((url) => (
                    <img key={url} src={resolveMediaUrl(url)} alt="" />
                  ))}
                </div>
              ) : null}
              {question.prompt?.text ? (
                <p className="learner-quiz-prompt">{question.prompt.text}</p>
              ) : null}
              <QuestionAudioSequence
                key={question.id}
                questionKey={question.id}
                promptAudioUrl={question.prompt?.audioUrl}
                onSequenceComplete={handleSequenceComplete}
              />
              <div className="learner-quiz-answers">
                {question.answers.map((answer) => {
                  const selected = selectedIds.includes(answer.id)
                  const isCorrect = result?.correctAnswerIds.includes(answer.id)
                  let className = 'learner-quiz-answer'
                  if (selected) className += ' is-selected'
                  if (result && isCorrect) className += ' is-correct'
                  if (result && selected && !isCorrect) className += ' is-wrong'
                  return (
                    <button
                      key={answer.id}
                      type="button"
                      className={className}
                      onClick={() => toggleAnswer(answer.id)}
                      disabled={Boolean(result) || checking}
                    >
                      <strong>{answer.label.toUpperCase()}</strong>
                      {answer.text ? <span>{answer.text}</span> : null}
                    </button>
                  )
                })}
              </div>

              {awaitingChoice && !result ? (
                <p className="learner-quiz-audio-status">Choisissez une réponse, puis validez.</p>
              ) : null}

              {result ? (
                <p className={result.isCorrect ? 'form-success' : 'form-error'}>
                  {result.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
                </p>
              ) : null}

              <div className="learner-quiz-actions">
                {!result ? (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={selectedIds.length === 0 || checking}
                  >
                    {checking ? 'Vérification…' : 'Valider'}
                  </button>
                ) : (
                  <p className="learner-quiz-audio-status">Passage automatique…</p>
                )}
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
