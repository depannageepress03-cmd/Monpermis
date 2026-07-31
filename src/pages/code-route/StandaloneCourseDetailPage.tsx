import { FormEvent, useCallback, useEffect, useState } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionCourse,
  fetchRevisionCourses,
  markRevisionCourseCompleted,
  startRevisionCourseSession,
  type LearnerCourse,
  type LearnerModule,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import { resolveVideoEmbed } from '../../utils/mediaEmbed'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { formatSeconds } from '../../utils/unlock'
import '../../styles/auth.css'
import '../../styles/learner.css'

const STANDALONE_CHAPTER = 'standalone'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

export function StandaloneCourseDetailPage() {
  const navigate = useNavigate()
  const { courseId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const state = location.state as { course?: LearnerCourse; courses?: LearnerCourse[] } | null

  const [course, setCourse] = useState<LearnerCourse | null>(state?.course ?? null)
  const [loading, setLoading] = useState(!state?.course)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [completed, setCompleted] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const found = state?.course?.id === courseId ? state.course : await fetchRevisionCourse(courseId)
      setCourse(found)
      const session = await startRevisionCourseSession(STANDALONE_CHAPTER, courseId)
      setSecondsRemaining(session.secondsRemaining)
      setCompleted(session.alreadyCompleted)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Cours introuvable')
      setCourse(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, state?.course])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault()
    if (!course) return
    setSaving(true)
    setError(null)
    try {
      await markRevisionCourseCompleted(STANDALONE_CHAPTER, course.id)
      setCompleted(true)
      const courses = state?.courses ?? (await fetchRevisionCourses())
      const index = courses.findIndex((item) => item.id === course.id)
      const next = index >= 0 ? courses[index + 1] : null
      if (next) {
        navigate(`/code-de-la-route/cours/${next.id}`, {
          replace: true,
          state: { course: next, courses },
        })
      } else {
        navigate('/code-de-la-route/cours', { replace: true })
      }
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={course?.title || 'Cours'}
          icon={<BookOpen size={22} />}
          onBack={() => navigate('/code-de-la-route/cours')}
          backLabel="Cours"
        />

        {loading ? <p className="subtitle">Chargement…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {course ? (
          <div className="auth-card learner-card learner-course-detail">
            <header className="learner-header">
              <p className="learner-kicker">Cours</p>
              <h2>{course.title}</h2>
              {secondsRemaining > 0 && !completed ? (
                <p className="subtitle">Temps minimum restant : {formatSeconds(secondsRemaining)}</p>
              ) : null}
              {completed ? (
                <p className="form-success">
                  <Check size={16} /> Cours terminé
                </p>
              ) : null}
            </header>

            <div className="learner-modules">
              {course.modules.map((module: LearnerModule) => {
                const embed = module.mediaType === 'video' ? resolveVideoEmbed(module.videoUrl) : null
                return (
                  <article key={module.id} className="learner-module-block">
                    {module.title || module.name ? (
                      <h3>{module.title || module.name}</h3>
                    ) : null}
                    {module.text ? (
                      <div
                        className="learner-module-html"
                        dangerouslySetInnerHTML={{ __html: module.text }}
                      />
                    ) : null}
                    {module.mediaType === 'image' && module.imageUrl ? (
                      <img src={mediaSrc(module.imageUrl)} alt="" />
                    ) : null}
                    {module.mediaType === 'video' && module.videoUrl ? (
                      embed ? (
                        <iframe
                          src={embed}
                          title={module.title || 'Vidéo'}
                          allowFullScreen
                        />
                      ) : (
                        <video src={mediaSrc(module.videoUrl)} controls playsInline />
                      )
                    ) : null}
                  </article>
                )
              })}
            </div>

            {!completed ? (
              <form onSubmit={handleComplete}>
                <button type="submit" className="btn-primary" disabled={saving || secondsRemaining > 0}>
                  {saving ? 'Enregistrement…' : 'Marquer comme terminé'}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
