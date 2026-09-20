import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, ChevronRight, ClipboardList, HelpCircle, Layers } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ContentError,
  fetchConduiteChapters,
  fetchConduiteProgressFull,
  fetchRevisionChapters,
  fetchRevisionProgressFull,
  type LearnerChapter,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import { Reveal } from '../../components/Reveal'
import { AppShell, userInitialsOf } from '../../components/layout/AppShell'
import { Badge, Button, Card, IconBadge, SectionTitle } from '../../components/ui'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Track = 'revision' | 'conduite'

export function LearnerChapterListPage({
  track,
  title,
  kicker,
  backTo,
  backLabel,
  navTitle,
  coursesPath,
  questionsPath,
  testSubjectPath,
}: {
  track: Track
  title: string
  kicker: string
  backTo: string
  backLabel: string
  navTitle?: string
  coursesPath?: (chapterId: string) => string
  questionsPath?: (chapterId: string) => string
  testSubjectPath?: (chapterId: string) => string
}) {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [chapters, setChapters] = useState<LearnerChapter[]>([])
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, progress] = await Promise.all([
        track === 'revision' ? fetchRevisionChapters() : fetchConduiteChapters(),
        track === 'revision' ? fetchRevisionProgressFull() : fetchConduiteProgressFull(),
      ])
      setChapters(data)
      setCompletedTestIds(new Set(progress.completedTests.map((entry) => entry.chapterId)))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [track])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

  const shellTab = track === 'conduite' ? 'conduite' : 'code'
  const shellTone = track === 'conduite' ? 'orange' : 'green'

  const showQuizActions = Boolean(questionsPath || testSubjectPath)
  const coursesOnly = Boolean(coursesPath) && !showQuizActions
  const revisionQuiz = track === 'revision' && showQuizActions

  return (
    <AppShell
      activeTab={shellTab}
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={navTitle || title}
          icon={
            coursesOnly || track === 'conduite' ? <BookOpen size={22} /> : <Layers size={22} />
          }
          onBack={() => navigate(backTo)}
          tone={track === 'conduite' ? 'drive' : 'default'}
          backLabel={backLabel}
        />

        <header className="auth-header learner-header">
          <SectionTitle>{kicker}</SectionTitle>
          <p>
            {revisionQuiz
              ? 'Entraînez-vous aux questions, puis validez chaque chapitre avec un sujet test.'
              : coursesOnly
                ? 'Choisissez un chapitre pour accéder à ses cours, à votre rythme.'
                : showQuizActions
                  ? 'Questions et sujets test pour chaque chapitre.'
                  : 'Parcourez les leçons dans l’ordre pour avancer dans votre formation. Chaque chapitre regroupe les cours pratiques publiés par l’auto-école.'}
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? (
            <div className="learner-empty">
              <p className="form-error">{error}</p>
              <Button variant="cta" tone={shellTone} onClick={() => void load()}>
                Réessayer
              </Button>
            </div>
          ) : null}
          {!loading && !error && chapters.length === 0 ? (
            <div className="learner-empty">
              <SectionTitle>Aucun chapitre publié</SectionTitle>
              <p className="subtitle">Les chapitres publiés par l’administration apparaîtront ici.</p>
            </div>
          ) : null}
          {!loading && !error ? (
            <div className="learner-list">
              {chapters.map((chapter, index) => {
                const numberedName = `${index + 1}. ${chapter.name}`
                const testDone = completedTestIds.has(chapter.id)

                if (revisionQuiz) {
                  const questionsTo = questionsPath?.(chapter.id)
                  const testTo = testSubjectPath?.(chapter.id)
                  return (
                    <Reveal key={chapter.id} delay={Math.min(index, 8) * 45}>
                    <Card className="learner-chapter-card learner-chapter-card--revision">
                      {questionsTo ? (
                        <Link
                          to={questionsTo}
                          state={{ chapterName: numberedName }}
                          className="learner-chapter-card-top learner-chapter-card-top--link"
                        >
                          <IconBadge icon={<span>{index + 1}</span>} tone="green" />
                          <span className="learner-item-body">
                            <strong>{chapter.name}</strong>
                            {testDone ? (
                              <Badge tone="green" icon={<Check size={12} aria-hidden />}>
                                Test validé
                              </Badge>
                            ) : (
                              <small>Questions + sujet test</small>
                            )}
                          </span>
                          <Button variant="icon" tone="green" aria-label="Ouvrir le chapitre" tabIndex={-1}>
                            <ChevronRight size={16} aria-hidden />
                          </Button>
                        </Link>
                      ) : null}
                      <div className="learner-chapter-actions learner-chapter-actions--revision">
                        {questionsTo ? (
                          <Link
                            to={questionsTo}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action learner-chapter-action--primary"
                          >
                            <HelpCircle size={16} aria-hidden />
                            <span>Questions</span>
                          </Link>
                        ) : null}
                        {testTo ? (
                          <Link
                            to={testTo}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action learner-chapter-action--secondary"
                          >
                            <ClipboardList size={16} aria-hidden />
                            <span>Sujet test</span>
                          </Link>
                        ) : null}
                      </div>
                    </Card>
                    </Reveal>
                  )
                }

                if (showQuizActions) {
                  return (
                    <Reveal key={chapter.id} delay={Math.min(index, 8) * 45}>
                    <Card className="learner-chapter-card">
                      <div className="learner-chapter-card-top">
                        <IconBadge icon={<span>{index + 1}</span>} tone={shellTone} />
                        <span className="learner-item-body">
                          <strong>{numberedName}</strong>
                          <Badge tone={testDone ? 'green' : 'orange'}>
                            {testDone ? 'Chapitre validé' : 'Questions + sujet test'}
                          </Badge>
                        </span>
                      </div>
                      <div className="learner-chapter-actions">
                        {coursesPath ? (
                          <Link
                            to={coursesPath(chapter.id)}
                            state={{ chapter: { ...chapter, name: numberedName } }}
                            className="learner-chapter-action"
                          >
                            <IconBadge icon={<BookOpen size={15} />} tone={shellTone} />
                            <span>Cours</span>
                          </Link>
                        ) : null}
                        {questionsPath ? (
                          <Link
                            to={questionsPath(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action"
                          >
                            <IconBadge icon={<HelpCircle size={15} />} tone={shellTone} />
                            <span>Questions</span>
                          </Link>
                        ) : null}
                        {testSubjectPath ? (
                          <Link
                            to={testSubjectPath(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action"
                          >
                            <IconBadge icon={<ClipboardList size={15} />} tone={shellTone} />
                            <span>Sujet test</span>
                          </Link>
                        ) : null}
                      </div>
                    </Card>
                    </Reveal>
                  )
                }

                if (!coursesPath) return null

                return (
                  <Reveal key={chapter.id} delay={Math.min(index, 8) * 45}>
                  <Card className="learner-item-card">
                  <Link
                    to={coursesPath(chapter.id)}
                    state={{ chapter: { ...chapter, name: numberedName } }}
                    className="learner-item"
                  >
                    <IconBadge icon={<span>{index + 1}</span>} tone={shellTone} />
                    <span className="learner-item-body">
                      <strong>{numberedName}</strong>
                      <Badge tone={shellTone}>{chapter.courses.length} cours</Badge>
                    </span>
                    <Button variant="icon" tone={shellTone} aria-label="Ouvrir le chapitre" tabIndex={-1}>
                      <ChevronRight size={16} aria-hidden />
                    </Button>
                  </Link>
                  </Card>
                  </Reveal>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </AppShell>
  )
}
