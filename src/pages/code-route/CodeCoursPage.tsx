import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Layers, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionCourses,
  fetchRevisionProgress,
  type LearnerCourse,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import { AppShell, userInitialsOf } from '../../components/layout/AppShell'
import { Badge, Button, Card, IconBadge } from '../../components/ui'
import { formatCourseHeading } from '../../utils/chapterLabel'
import '../../styles/auth.css'
import '../../styles/learner.css'

const STANDALONE_CHAPTER = 'standalone'

/** Liste des cours code — même UX que les cours de conduite. */
export function CodeCoursPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [courses, setCourses] = useState<LearnerCourse[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lockHint, setLockHint] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, progress] = await Promise.all([
        fetchRevisionCourses(),
        fetchRevisionProgress(STANDALONE_CHAPTER),
      ])
      setCourses(list)
      setCompletedIds(new Set(progress.map((entry) => String(entry.courseId))))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const isUnlocked = useMemo(() => {
    return (_index: number) => true
  }, [])

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <p className="subtitle">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

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
          title="Cours"
          icon={<Layers size={20} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <header className="auth-header learner-header learner-courses-intro learner-anim-header">
          <div className="learner-courses-accents" aria-hidden="true">
            <span className="learner-accent learner-accent-green" />
            <span className="learner-accent learner-accent-gold" />
            <span className="learner-accent learner-accent-navy" />
          </div>
          <p className="learner-courses-lead">Accédez aux cours librement, à votre rythme.</p>
          <p className="learner-courses-detail">
            Prenez le temps de bien comprendre chaque notion.
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {lockHint ? <p className="form-error">{lockHint}</p> : null}
          {!loading && !error && courses.length === 0 ? (
            <Card className="learner-empty">
              <h2>Aucun cours</h2>
              <p className="subtitle">Aucun cours publié pour le moment.</p>
            </Card>
          ) : null}
          <div className="learner-list">
            {courses.map((course: LearnerCourse, index) => {
              const unlocked = isUnlocked(index)
              const completed = completedIds.has(String(course.id))
              const content = (
                <>
                  <IconBadge
                    icon={
                      !unlocked ? (
                        <Lock size={20} />
                      ) : completed ? (
                        <Check size={20} />
                      ) : (
                        <span>{index + 1}</span>
                      )
                    }
                    tone={!unlocked ? 'orange' : 'green'}
                  />
                  <span className="learner-item-body">
                    <strong>{formatCourseHeading(index, course.title)}</strong>
                    <Badge tone={completed ? 'green' : !unlocked ? 'orange' : 'green'}>
                      {completed
                        ? 'Terminé'
                        : !unlocked
                          ? 'Verrouillé — terminez le cours précédent'
                          : 'Appuyez pour ouvrir'}
                    </Badge>
                  </span>
                  {unlocked ? (
                    <Button
                      variant="icon"
                      tone="green"
                      aria-label={`Ouvrir ${course.title}`}
                      tabIndex={-1}
                      style={{ pointerEvents: 'none' }}
                    >
                      <ChevronRight size={18} />
                    </Button>
                  ) : (
                    <Lock size={16} />
                  )}
                </>
              )

              if (!unlocked) {
                return (
                  <Card key={course.id} className="learner-anim-item">
                    <button
                      type="button"
                      className="learner-item is-disabled learner-anim-item"
                      style={{ animationDelay: `${0.22 + index * 0.08}s` }}
                      onClick={() =>
                        setLockHint(
                          'Ce cours est verrouillé. Validez le cours précédent (case « J’ai terminé ce cours ») pour le débloquer.',
                        )
                      }
                    >
                      {content}
                    </button>
                  </Card>
                )
              }

              return (
                <Card key={course.id} className="learner-anim-item">
                  <Link
                    to={`/code-de-la-route/cours/${course.id}`}
                    state={{ course, courses }}
                    className={`learner-item${completed ? ' is-done' : ''} learner-anim-item`}
                    style={{ animationDelay: `${0.22 + index * 0.08}s` }}
                    onClick={() => setLockHint(null)}
                  >
                    {content}
                  </Link>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  )
}
