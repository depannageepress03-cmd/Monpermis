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
import { QuestionPromptHtml } from '../../components/QuestionPromptHtml'
import { PageLoader } from '../../components/PageLoader'
import { PageNavbar } from '../../components/PageNavbar'
import { QuizProgressRing } from '../../components/QuizProgressRing'
import { SuccessCelebration } from '../../components/SuccessCelebration'
import { useAuth } from '../../hooks/useAuth'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { stopAllQuizAudio } from '../../utils/quizSounds'
import { resolveCodeImageUrl } from '../../utils/codeImageUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'

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

  useFocusRefresh(Boolean(user), () => {
    void fetchPracticeExams()
      .then(setData)
      .catch(() => undefined)
  })

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

  if (authLoading || !user) return <PageLoader />

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
            {data?.examTotal ?? 24} sujets de test · mélange aléatoire de tous les chapitres ·{' '}
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
                          <strong>Sujet {exam.examNumber}</strong>
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
  const [pulseAnswerId, setPulseAnswerId] = useState<string | null>(null)

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

  const number = Number(examNumber)

  const load = useCallback(async () => {
    if (!Number.isInteger(number) || number < 1) {
      setError('Examen invalide')
      setLoading(false)
      return
    }
    stopAllQuizAudio()
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startPracticeExam(number)
      setAttempt(started)
      const answered = started.answeredCount || 0
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)))
      setSelectedIds([])
      setSubmitted(false)
      setAnsweredCount(answered)
      setFinished(started.status === 'completed')
      setSequenceLive(started.status !== 'completed')
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

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds([])
    setSubmitted(false)
    stopAllQuizAudio()
  }, [index])

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
    setPulseAnswerId(answerId)
    window.setTimeout(() => setPulseAnswerId(null), 420)
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
  }, [])

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
      setAnsweredCount(data.answeredCount)
      await finishOrAdvance()
    } catch (err) {
      setSubmitted(false)
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
        submittedRef.current
      )
        return

      setChecking(true)
      setSubmitted(true)
      setSequenceLive(false)
      stopAllQuizAudio()
      try {
        const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, ids)
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
    if (ids.length === 0 || checking || submitted) return
    setSequenceLive(false)
    stopAllQuizAudio()
    void resolveSelection(ids)
  }

  const leaveMessage =
    answeredCount > 0
      ? `Quitter ? Vos ${answeredCount} réponses sont enregistrées — reprenez via Continuer sur la même épreuve.`
      : 'Quitter ? Votre progression en cours sera conservée si vous reprenez le même examen.'
  const { confirmLeave } = useLeaveGuard(Boolean(attempt) && !finished && !loading, leaveMessage)

  if (authLoading || !user) return <PageLoader />

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={`Examen ${number}`}
          icon={<ClipboardList size={22} />}
          onBack={() => {
            if (!confirmLeave()) return
            navigate('/code-de-la-route/examens-test')
          }}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Examen blanc</p>
          <p>
            Seuil de réussite : {attempt?.passScore ?? 14}/20 · Résultats à la fin
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {!loading && !finished && answeredCount > 0 ? (
            <p className="form-success">
              Reprise à la question {Math.min(index + 1, attempt?.total || 20)} · {answeredCount}{' '}
              réponse{answeredCount > 1 ? 's' : ''} enregistrée{answeredCount > 1 ? 's' : ''}.
            </p>
          ) : null}

          {!loading && finished && finalScore ? (
            <SuccessCelebration
              title={finalScore.passed ? 'Examen réussi' : 'Examen non réussi'}
              subtitle={
                <p className="subtitle">
                  Note finale : <strong>{finalScore.scoreLabel}</strong> (moyenne{' '}
                  {finalScore.passScore}/20)
                </p>
              }
              passed={finalScore.passed}
            >
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
            </SuccessCelebration>
          ) : null}

          {!loading && !error && question && !finished ? (
            <form className="learner-quiz">
              <div key={index} className="mp-quiz-enter">
              <div className="learner-quiz-progress-row">
                <QuizProgressRing
                  current={Math.min(index + 1, questions.length)}
                  total={questions.length}
                />
                <p className="learner-quiz-progress">{progressLabel}</p>
              </div>
              {(question.correctCount ?? 1) > 1 ? (
                <span className="learner-multi-badge">
                  {question.correctCount} bonnes réponses à cocher
                </span>
              ) : null}
              {question.prompt?.imageUrls?.length ? (
                <div className="learner-quiz-images">
                  {question.prompt.imageUrls.map((url) => (
                    <img key={url} src={resolveCodeImageUrl(url)} alt="" />
                  ))}
                </div>
              ) : null}
              {question.prompt?.text ? (
                <QuestionPromptHtml className="learner-quiz-prompt" text={question.prompt?.text} />
              ) : null}
              {sequenceLive && !submitted ? (
                <QuestionAudioSequence
                  key={question.id}
                  questionKey={question.id}
                  promptAudioUrl={question.prompt?.audioUrl}
                  offlineOnly
                  onSequenceComplete={handleSequenceComplete}
                />
              ) : null}

              <div className="learner-quiz-answers">
                {question.answers.map((answer) => {
                  const selected = selectedIds.includes(answer.id)
                  let className = 'learner-quiz-answer'
                  if (selected) className += ' is-selected'
                  if (pulseAnswerId === answer.id) className += ' is-pulse'
                  return (
                    <button
                      key={answer.id}
                      type="button"
                      className={className}
                      onClick={() => toggleAnswer(answer.id)}
                      disabled={submitted || checking}
                    >
                      <strong>{answer.label.toUpperCase()}</strong>
                      {answer.text ? <span>{answer.text}</span> : null}
                    </button>
                  )
                })}
              </div>

              <div className="learner-quiz-actions">
                {!submitted && selectedIds.length > 0 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={checking}
                    onClick={handleContinue}
                  >
                    {checking ? 'Enregistrement…' : 'Continuer'}
                  </button>
                ) : null}
                {!submitted && selectedIds.length === 0 ? (
                  <p className="learner-quiz-audio-status">
                    L’audio lit la question 2 fois. Vous pouvez cocher pendant la lecture ; Continuer
                    valide sans attendre. Sans choix à la fin : question ratée.
                  </p>
                ) : null}
              </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
