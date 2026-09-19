import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, ClipboardList, HelpCircle, Target, Trophy } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionChapterQuestions,
  fetchRevisionChapters,
  fetchRevisionProgressFull,
  type LearnerQuestion,
  type TestProgressEntry,
} from '../../api/content'
import { PageNavbar } from '../../components/PageNavbar'
import { Reveal } from '../../components/Reveal'
import { useAuth } from '../../hooks/useAuth'
import { unlockQuizAudio } from '../../utils/quizSounds'
import '../../styles/auth.css'
import '../../styles/learner.css'

export function LearnerChapterQuestionsListPage() {
  const navigate = useNavigate()
  const { chapterId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || ''
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre')
  const [questions, setQuestions] = useState<LearnerQuestion[]>([])
  const [testEntry, setTestEntry] = useState<TestProgressEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const [list, progress] = await Promise.all([
        fetchRevisionChapterQuestions(chapterId),
        fetchRevisionProgressFull(chapterId).catch(() => null),
      ])
      setQuestions(list)
      setTestEntry(
        progress?.completedTests?.find((item) => item.chapterId === chapterId) || null,
      )
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
      setTestEntry(null)
    } finally {
      setLoading(false)
    }
  }, [chapterId, stateChapterName])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

  const count = questions.length
  const testRatio =
    testEntry && testEntry.total > 0
      ? Math.max(0, Math.min(1, testEntry.correct / testEntry.total))
      : null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={chapterName}
          icon={<HelpCircle size={22} />}
          onBack={() => navigate('/code-de-la-route/revision-chapitres')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Entraînement</p>
          <h1>Questions</h1>
          <p>
            {loading
              ? 'Chargement…'
              : count > 0
                ? 'Choisissez une question pour vous entraîner.'
                : 'Aucune question publiée pour ce chapitre.'}
          </p>
        </header>

        <div className="auth-card learner-card">
          {error ? <p className="form-error">{error}</p> : null}

          <Reveal delay={60}>
          <div className="learner-hub-duo">
            <span className="learner-hub-duo-card learner-hub-duo-card--green learner-hub-duo-card--active">
              <span className="learner-hub-duo-icon">
                <HelpCircle size={20} aria-hidden />
              </span>
              <span className="learner-hub-duo-title">Questions</span>
              <span className="learner-hub-duo-sub">
                {count > 0 ? `${count} questions` : 'Entraînement'}
              </span>
            </span>
            <Link
              className="learner-hub-duo-card learner-hub-duo-card--gold"
              to={`/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`}
              state={{ chapterName }}
              onClick={() => unlockQuizAudio()}
            >
              <span className="learner-hub-duo-chevron" aria-hidden>
                <ChevronRight size={16} />
              </span>
              <span className="learner-hub-duo-icon">
                <ClipboardList size={20} aria-hidden />
              </span>
              <span className="learner-hub-duo-title">Sujet test</span>
              <span className="learner-hub-duo-sub">
                {testEntry
                  ? `${testEntry.correct}/${testEntry.total}`
                  : 'Validez le chapitre'}
              </span>
            </Link>
          </div>
          </Reveal>

          {!loading && !error && count === 0 ? (
            <div className="learner-empty">
              <h2>Aucune question</h2>
              <p className="subtitle">Les questions publiées de ce chapitre apparaîtront ici.</p>
            </div>
          ) : null}

          {!loading && !error && count > 0 ? (
            <>
              <div className="learner-quiz-stats">
                <div className="learner-quiz-stat">
                  <HelpCircle size={14} aria-hidden />
                  <strong>{count}</strong>
                  <span>Questions</span>
                </div>
                {testRatio != null ? (
                  <div className="learner-quiz-stat">
                    <Target size={14} aria-hidden />
                    <strong>{Math.round(testRatio * 100)}%</strong>
                    <span>Sujet test</span>
                  </div>
                ) : null}
                {testEntry ? (
                  <div className="learner-quiz-stat">
                    <Trophy size={14} aria-hidden />
                    <strong>
                      {testEntry.correct}/{testEntry.total}
                    </strong>
                    <span>Meilleur score</span>
                  </div>
                ) : null}
              </div>
              {testEntry ? (
                <p className="subtitle">
                  Sujet test : {testEntry.correct} / {testEntry.total}
                </p>
              ) : null}
              <div className="learner-question-list">
                {questions.map((question, index) => (
                  <Reveal
                    key={question.id}
                    delay={100 + Math.min(index, 10) * 30}
                  >
                  <Link
                    className="learner-question-row learner-question-row--num-only"
                    to={`/code-de-la-route/revision-chapitres/${chapterId}/questions/${index}`}
                    state={{ chapterName }}
                    onClick={() => unlockQuizAudio()}
                    aria-label={`Question ${index + 1}`}
                  >
                    <span className="learner-question-num">{index + 1}</span>
                    <ChevronRight size={16} aria-hidden />
                  </Link>
                  </Reveal>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
