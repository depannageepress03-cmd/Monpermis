import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionCourses,
  type LearnerCourse,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import '../../styles/auth.css'
import '../../styles/learner.css'

/** Liste des cours autonomes (plus liés aux chapitres). */
export function CodeCoursPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [courses, setCourses] = useState<LearnerCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCourses(await fetchRevisionCourses())
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Cours"
          icon={<BookOpen size={22} />}
          onBack={() => navigate('/code-de-la-route')}
          backLabel="Retour"
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Code de la route</p>
          <p>Choisissez un cours pour accéder à ses modules.</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? (
            <div className="learner-empty">
              <p className="form-error">{error}</p>
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Réessayer
              </button>
            </div>
          ) : null}
          {!loading && !error && courses.length === 0 ? (
            <div className="learner-empty">
              <h2>Aucun cours publié</h2>
              <p className="subtitle">Les cours publiés par l’administration apparaîtront ici.</p>
            </div>
          ) : null}
          {!loading && !error ? (
            <div className="learner-list">
              {courses.map((course, index) => (
                <Link
                  key={course.id}
                  to={`/code-de-la-route/cours/${course.id}`}
                  state={{ course, courses }}
                  className="learner-item"
                >
                  <span className="learner-item-icon">{index + 1}</span>
                  <span className="learner-item-body">
                    <strong>{course.title}</strong>
                    <small>
                      {course.modules.length} module{course.modules.length !== 1 ? 's' : ''}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
