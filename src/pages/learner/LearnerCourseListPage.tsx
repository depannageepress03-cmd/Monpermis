import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Layers, Lock } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchConduiteChapters,
  fetchConduiteProgress,
  fetchRevisionChapters,
  fetchRevisionProgress,
  type LearnerChapter,
  type LearnerCourse,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Track = 'revision' | 'conduite'

export function LearnerCourseListPage({
  track,
  chaptersBackTo,
  detailPath,
}: {
  track: Track
  chaptersBackTo: string
  detailPath: (chapterId: string, courseId: string) => string
}) {
  const navigate = useNavigate()
  const { chapterId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const stateChapter = (location.state as { chapter?: LearnerChapter } | null)?.chapter

  const [chapter, setChapter] = useState<LearnerChapter | null>(stateChapter ?? null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!stateChapter)
  const [error, setError] = useState<string | null>(null)
  const [lockHint, setLockHint] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const chapters =
        track === 'revision' ? await fetchRevisionChapters() : await fetchConduiteChapters()
      const chapterIndex = chapters.findIndex((item) => String(item.id) === String(chapterId))
      const found = chapterIndex >= 0 ? chapters[chapterIndex] : null
      setChapter(
        found
          ? { ...found, name: `${chapterIndex + 1}. ${found.name}` }
          : null,
      )
      if (!found) {
        setError('Chapitre introuvable ou non publié')
        return
      }
      const progress =
        track === 'revision'
          ? await fetchRevisionProgress(chapterId)
          : await fetchConduiteProgress(chapterId)
      setCompletedIds(new Set(progress.map((entry) => String(entry.courseId))))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId, track])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const courses = chapter?.courses ?? []

  const isUnlocked = useMemo(() => {
    return (index: number) => {
      if (index === 0) return true
      const prevId = courses[index - 1]?.id
      return prevId ? completedIds.has(String(prevId)) : true
    }
  }, [completedIds, courses])

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
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={formatChapterHeading(chapter?.name ?? 'Cours')}
          icon={<Layers size={20} />}
          onBack={() => navigate(chaptersBackTo)}
          tone={track === 'conduite' ? 'drive' : 'default'}
        />

        <header className="auth-header learner-header learner-courses-intro learner-anim-header">
          <div className="learner-courses-accents" aria-hidden="true">
            <span className="learner-accent learner-accent-green" />
            <span className="learner-accent learner-accent-gold" />
            <span className="learner-accent learner-accent-navy" />
          </div>
          <p className="learner-courses-lead">
            Parcourez les cours dans l’ordre. Chaque leçon validée ouvre la suivante pour
            construire vos bases solidement.
          </p>
          <p className="learner-courses-detail">
            Prenez le temps de bien comprendre chaque notion avant de passer à la suite.
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {lockHint ? <p className="form-error">{lockHint}</p> : null}
          {!loading && !error && courses.length === 0 ? (
            <div className="learner-empty">
              <h2>Aucun cours</h2>
              <p className="subtitle">Ce chapitre ne contient pas encore de cours publiés.</p>
            </div>
          ) : null}
          <div className="learner-list">
            {courses.map((course: LearnerCourse, index) => {
              const unlocked = isUnlocked(index)
              const completed = completedIds.has(String(course.id))
              const content = (
                <>
                  <span className={`learner-item-icon${unlocked ? '' : ' is-locked'}`}>
                    {!unlocked ? <Lock size={20} /> : completed ? <Check size={20} /> : index + 1}
                  </span>
                  <span className="learner-item-body">
                    <strong>{formatCourseHeading(index, course.title)}</strong>
                    <small>
                      {completed
                        ? 'Terminé'
                        : !unlocked
                          ? 'Verrouillé — terminez le cours précédent'
                          : 'Appuyez pour ouvrir'}
                    </small>
                  </span>
                  {unlocked ? <ChevronRight size={18} /> : <Lock size={16} />}
                </>
              )

              if (!unlocked) {
                return (
                  <button
                    key={course.id}
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
                )
              }

              return (
                <Link
                  key={course.id}
                  to={detailPath(chapterId, String(course.id))}
                  state={{ chapter, course, courses }}
                  className={`learner-item${completed ? ' is-done' : ''} learner-anim-item`}
                  style={{ animationDelay: `${0.22 + index * 0.08}s` }}
                  onClick={() => setLockHint(null)}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
