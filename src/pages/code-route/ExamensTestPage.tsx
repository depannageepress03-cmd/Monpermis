import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, HelpCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  checkPracticeExamAnswer,
  completePracticeExam,
  ContentError,
  fetchPracticeExams,
  startPracticeExam,
  type PracticeExamAttempt,
  type PracticeExamsOverview,
} from '../../api/content'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { playFailSound, playRemoteAudio, playSuccessSound } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function ExamensTestPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<PracticeExamsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchPracticeExams())
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  // Notes en temps réel pendant que la page est ouverte
  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      void fetchPracticeExams()
        .then(setData)
        .catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [user])

  const handleStart = async (examNumber: number) => {
    setStarting(examNumber)
    setError(null)
    try {
      const { attempt } = await startPracticeExam(examNumber)
      navigate(`/code-de-la-route/examens-test/${examNumber}`, {
        state: { attemptId: attempt.id },
      })
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Démarrage impossible')
    } finally {
      setStarting(null)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
      title="Examens test"
          icon={<HelpCircle size={22} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Auto-évaluation</p>
          <p>
            {data?.examTotal ?? 24} examens blancs mélangés aléatoirement ·{' '}
            {data?.requiredSize ?? 20} questions · note sur 20 · moyenne {data?.passScore ?? 14}/20
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {data ? (
            <>
              {data.unlocked === false ? (
                <div className="learner-empty">
                  <h2>Examens test verrouillés</h2>
                  <p className="subtitle">
                    {data.message ||
                      'Terminez tous les cours de chaque chapitre pour débloquer les examens test. Vous pouvez encore répondre aux questions et passer le sujet test de chaque chapitre.'}
                  </p>
                  <Link to="/code-de-la-route/revision-chapitres" className="btn-primary">
                    Continuer la révision
                  </Link>
                </div>
              ) : (
                <>
                  <div className="practice-progress-banner">
                    <div>
                      <strong>
                        {data.completedCount}/{data.examTotal}
                      </strong>
                      <span>examens passés</span>
                    </div>
                    <div>
                      <strong>
                        {data.passedCount}/{data.examTotal}
                      </strong>
                      <span>réussis (≥ {data.passScore}/20)</span>
                    </div>
                    <Link to="/code-de-la-route/mes-notes" className="btn-outline">
                      Voir mes notes
                    </Link>
                  </div>

                  {data.message ? <p className="subtitle">{data.message}</p> : null}

                  <div className="practice-exam-list">
                    {data.exams.map((exam) => (
                      <article key={exam.id} className={`practice-exam-card is-${exam.status}`}>
                        <div>
                          <strong>Examen {exam.examNumber}</strong>
                          <small>
                            {exam.questionCount} questions
                            {exam.score
                              ? ` · ${exam.score.scoreLabel}${exam.score.passed ? ' · Réussi' : ' · À retravailler'}`
                              : exam.status === 'in_progress'
                                ? ' · En cours'
                                : ' · Disponible'}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn-primary btn-primary-inline"
                          disabled={starting === exam.examNumber || data.examCount === 0}
                          onClick={() => void handleStart(exam.examNumber)}
                        >
                          {starting === exam.examNumber
                            ? 'Ouverture…'
                            : exam.status === 'completed'
                              ? 'Repasser'
                              : exam.status === 'in_progress'
                                ? 'Continuer'
                                : 'Commencer'}
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ExamensTestTakePage() {
  const navigate = useNavigate()
  const { examNumber = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
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

  const number = Number(examNumber)

  const load = useCallback(async () => {
    if (!Number.isInteger(number) || number < 1) {
      setError('Examen invalide')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startPracticeExam(number)
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
      setAttempt(null)
    } finally {
      setLoading(false)
    }
  }, [number])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

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
        const { attempt: score } = await completePracticeExam(currentAttempt.id)
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
    try {
      const promptUrl = currentQuestion.prompt?.audioUrl
        ? resolveMediaUrl(currentQuestion.prompt.audioUrl)
        : ''
      const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, [])
      setResult({ isCorrect: false, correctAnswerIds: [] })
      setLiveCorrect(data.liveCorrect)
      setAnsweredCount(data.answeredCount)
      if (promptUrl) void playRemoteAudio(promptUrl)
      await playFailSound()
      await wait(500)
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
      try {
        const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, ids)
        setResult({ isCorrect: data.isCorrect, correctAnswerIds: data.correctAnswerIds })
        setLiveCorrect(data.liveCorrect)
        setAnsweredCount(data.answeredCount)
        if (data.isCorrect) await playSuccessSound()
        else await playFailSound()
        await wait(900)
        await finishOrAdvance()
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
      } finally {
        setChecking(false)
      }
    },
    [finishOrAdvance],
  )

  const handleSequenceComplete = useCallback(() => {
    const ids = selectedIdsRef.current
    if (ids.length > 0) {
      void resolveSelection(ids)
      return
    }
    void skipMissed()
  }, [resolveSelection, skipMissed])

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={`Examen ${number}`}
          icon={<ClipboardList size={22} />}
          onBack={() => navigate('/code-de-la-route/examens-test')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Examen blanc</p>
          <p>
            Note en direct : {liveCorrect}/{attempt?.total ?? 20} · Seuil{' '}
            {attempt?.passScore ?? 14}/20
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && finished && finalScore ? (
            <div className="learner-empty">
              <h2>{finalScore.passed ? 'Examen réussi' : 'Examen non réussi'}</h2>
              <p className="subtitle">
                Note finale : <strong>{finalScore.scoreLabel}</strong> (moyenne{' '}
                {finalScore.passScore}/20)
              </p>
              <div className="learner-quiz-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/code-de-la-route/mes-notes')}
                >
                  Voir mes notes
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => navigate('/code-de-la-route/examens-test')}
                >
                  Retour aux examens
                </button>
              </div>
            </div>
          ) : null}

          {!loading && !error && question && !finished ? (
            <form className="learner-quiz">
              <p className="learner-quiz-progress">
                {progressLabel} · Score live {liveCorrect}/{answeredCount || '—'}
              </p>
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

              {result ? (
                <p className={result.isCorrect ? 'form-success' : 'form-error'}>
                  {result.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
                </p>
              ) : null}

              <div className="learner-quiz-actions">
                {!result ? (
                  <p className="learner-quiz-audio-status">
                    Cochez pendant l’écoute / le décompte — passage auto à 0.
                  </p>
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
