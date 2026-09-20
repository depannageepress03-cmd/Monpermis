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
import { AppShell, userInitialsOf } from '../../components/layout/AppShell'
import { Badge, Button, Card, IconBadge, SectionTitle, StatCard } from '../../components/ui'
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
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={chapterName}
          icon={<HelpCircle size={22} />}
          onBack={() => navigate('/code-de-la-route/revision-chapitres')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Entraînement</p>
          <SectionTitle>Questions</SectionTitle>
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
            <Card className="learner-hub-duo-card learner-hub-duo-card--green learner-hub-duo-card--active">
              <IconBadge icon={<HelpCircle size={20} aria-hidden />} tone="green" />
              <span className="learner-hub-duo-title">Questions</span>
              <Badge tone="green">
                {count > 0 ? `${count} questions` : 'Entraînement'}
              </Badge>
            </Card>
            <Link
              className="learner-hub-duo-card learner-hub-duo-card--gold"
              to={`/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`}
              state={{ chapterName }}
              onClick={() => unlockQuizAudio()}
            >
              <Button variant="icon" tone="orange" aria-label="Aller au sujet test" tabIndex={-1}>
                <ChevronRight size={16} aria-hidden />
              </Button>
              <IconBadge icon={<ClipboardList size={20} aria-hidden />} tone="orange" />
              <span className="learner-hub-duo-title">Sujet test</span>
              <Badge tone="orange">
                {testEntry
                  ? `${testEntry.correct}/${testEntry.total}`
                  : 'Validez le chapitre'}
              </Badge>
            </Link>
          </div>
          </Reveal>

          {!loading && !error && count === 0 ? (
            <div className="learner-empty">
              <SectionTitle>Aucune question</SectionTitle>
              <p className="subtitle">Les questions publiées de ce chapitre apparaîtront ici.</p>
            </div>
          ) : null}

          {!loading && !error && count > 0 ? (
            <>
              <div className="learner-quiz-stats">
                <StatCard
                  icon={<HelpCircle size={14} aria-hidden />}
                  label="Questions"
                  value={String(count)}
                />
                {testRatio != null ? (
                  <StatCard
                    icon={<Target size={14} aria-hidden />}
                    label="Sujet test"
                    value={`${Math.round(testRatio * 100)}%`}
                  />
                ) : null}
                {testEntry ? (
                  <StatCard
                    icon={<Trophy size={14} aria-hidden />}
                    label="Meilleur score"
                    value={`${testEntry.correct}/${testEntry.total}`}
                  />
                ) : null}
              </div>
              {testEntry ? (
                <Badge tone="green">
                  Sujet test : {testEntry.correct} / {testEntry.total}
                </Badge>
              ) : null}
              <div className="learner-question-list">
                {questions.map((question, index) => (
                  <Reveal
                    key={question.id}
                    delay={100 + Math.min(index, 10) * 30}
                  >
                  <Card className="learner-question-card">
                  <Link
                    className="learner-question-row learner-question-row--num-only"
                    to={`/code-de-la-route/revision-chapitres/${chapterId}/questions/${index}`}
                    state={{ chapterName }}
                    onClick={() => unlockQuizAudio()}
                    aria-label={`Question ${index + 1}`}
                  >
                    <IconBadge icon={<span>{index + 1}</span>} tone="green" />
                    <Button variant="icon" tone="green" aria-label={`Ouvrir la question ${index + 1}`} tabIndex={-1}>
                      <ChevronRight size={16} aria-hidden />
                    </Button>
                  </Link>
                  </Card>
                  </Reveal>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
    </AppShell>
  )
}
