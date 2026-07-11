import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
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
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Mode = 'practice' | 'test'

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
    setSelectedIds((current) =>
      current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId],
    )
  }

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault()
    if (!question || selectedIds.length === 0 || checking) return
    setChecking(true)
    try {
      const data = await checkRevisionQuestionAnswers(chapterId, question.id, selectedIds)
      setResult(data)
      setScore((current) => ({
        correct: current.correct + (data.isCorrect ? 1 : 0),
        total: current.total + 1,
      }))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }

  const goNext = async () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      if (mode === 'test' && !testSaved) {
        setSavingTest(true)
        try {
          await markRevisionTestCompleted(chapterId, score.correct, score.total)
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
  }

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
                answerAudioUrls={question.answers.map((answer) => answer.audioUrl)}
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
                  <button type="button" className="btn-primary" onClick={goNext}>
                    {index + 1 >= questions.length ? 'Voir le score' : 'Question suivante'}
                  </button>
                )}
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
