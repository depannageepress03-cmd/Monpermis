import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { PageLoader } from '../../components/PageLoader'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { playFailSound, playSuccessSound, stopAllQuizAudio } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { resolveCodeImageUrl } from '../../utils/codeImageUrl'
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
  const { chapterId = '', subjectNumber: subjectNumberParam } = useParams()
  const subjectNumber = Math.max(1, parseInt(String(subjectNumberParam || '1'), 10) || 1)
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || ''
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre')
  const [subjectLabel, setSubjectLabel] = useState(
    mode === 'test' ? `Sujet ${subjectNumber}` : '',
  )

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
  const [sequenceLive, setSequenceLive] = useState(true)

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

  const load = useCallback(async () => {
    stopAllQuizAudio()
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
      if (mode === 'test') {
        const subject = await fetchRevisionChapterTestSubject(chapterId, subjectNumber)
        setSubjectLabel(subject.label || `Sujet ${subjectNumber}`)
        setQuestions(subject.questions || [])
      } else {
        setSubjectLabel('')
        setQuestions(await fetchRevisionChapterQuestions(chapterId))
      }
      setIndex(0)
      setSelectedIds([])
      setResult(null)
      setScore({ correct: 0, total: 0 })
      setFinished(false)
      setTestSaved(false)
      setSequenceLive(true)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [chapterId, mode, stateChapterName, subjectNumber])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds([])
    setResult(null)
    stopAllQuizAudio()
  }, [index])

  useEffect(() => {
    if (finished) stopAllQuizAudio()
  }, [finished])

  // Sélection d’une réponse : ne coupe PAS l’audio (2 lectures complètes jusqu’à Continuer / fin de séquence).

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

  const finishOrAdvance = useCallback(
    async (nextScore: { correct: number; total: number }) => {
      const currentIndex = indexRef.current
      const list = questionsRef.current
      if (currentIndex + 1 >= list.length) {
        stopAllQuizAudio()
        setSequenceLive(false)
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
      stopAllQuizAudio()
      setIndex((value) => value + 1)
      setSelectedIds([])
      setResult(null)
      setSequenceLive(true)
    },
    [chapterId, mode],
  )

  const skipMissed = useCallback(async () => {
    if (checkingRef.current || resultRef.current) return
    setChecking(true)
    setSequenceLive(false)
    stopAllQuizAudio()
    try {
      setResult({ isCorrect: false, correctAnswerIds: [] })
      const nextScore = {
        correct: scoreRef.current.correct,
        total: scoreRef.current.total + 1,
      }
      setScore(nextScore)
      void playFailSound()
    } finally {
      setChecking(false)
    }
  }, [])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentQuestion = questionsRef.current[indexRef.current]
      if (!currentQuestion || ids.length === 0 || checkingRef.current || resultRef.current) return

      setChecking(true)
      setSequenceLive(false)
      stopAllQuizAudio()
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
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
        setSequenceLive(selectedIdsRef.current.length === 0)
      } finally {
        setChecking(false)
      }
    },
    [chapterId],
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
    stopAllQuizAudio()
    void resolveSelection(ids)
  }
  const { confirmLeave } = useLeaveGuard(!finished && !loading && questions.length > 0)

  if (authLoading || !user) return <PageLoader />

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={mode === 'test' ? subjectLabel || 'Sujet test' : 'Questions'}
          icon={mode === 'test' ? <ClipboardList size={22} /> : <HelpCircle size={22} />}
          onBack={() => {
            if (!confirmLeave()) return
            navigate(backTo(chapterId))
          }}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">{mode === 'test' ? 'Sujet test' : 'Entraînement'}</p>
          <h1>{mode === 'test' ? subjectLabel || 'Évaluation' : 'Questions'}</h1>
          <p>
            {mode === 'test'
              ? `${chapterName} — répondez à chaque question à votre rythme.`
              : `${chapterName} — cochez la ou les bonnes réponses, puis validez.`}
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && !error && questions.length === 0 ? (
            <div className="learner-empty">
              <h2>{mode === 'test' ? 'Aucun sujet test' : 'Aucune question'}</h2>
              <p className="subtitle">
                {mode === 'test'
                  ? 'Aucune question publiée pour ce chapitre. Publiez des questions dans l’admin pour activer le sujet test automatique.'
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
                      ? 'Sujet test enregistré. Vous pouvez recommencer ou passer à un autre chapitre.'
                      : 'Sujet test terminé.'}
                </p>
              ) : null}
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Recommencer
              </button>
            </div>
          ) : null}

          {!loading && !error && question && !finished ? (
            <div className="learner-quiz">
              <p className="learner-quiz-progress">{progressLabel}</p>
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
                <p className="learner-quiz-prompt">{question.prompt.text}</p>
              ) : null}
              {sequenceLive && !result ? (
                <QuestionAudioSequence
                  key={question.id}
                  questionKey={question.id}
                  promptAudioUrl={question.prompt?.audioUrl}
                  onSequenceComplete={handleSequenceComplete}
                />
              ) : null}
              <p className="learner-quiz-answers-title">Choisissez la ou les bonnes réponses</p>
              {!result ? (
                <p className="learner-quiz-audio-status">
                  Audio : 2 lectures. Vous pouvez cocher pendant la lecture.
                </p>
              ) : null}

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
                      <span className={`learner-quiz-check ${selected ? 'is-on' : ''}`} aria-hidden />
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
                {!result && selectedIds.length > 0 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={checking}
                    onClick={handleContinue}
                  >
                    {checking ? 'Vérification…' : 'Valider'}
                  </button>
                ) : null}
                {result ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void finishOrAdvance(score)}
                  >
                    {index + 1 >= questions.length ? 'Voir le score' : 'Question suivante'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
