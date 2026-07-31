import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionCourse,
  fetchRevisionCourses,
  fetchRevisionProgress,
  markRevisionCourseCompleted,
  startRevisionCourseSession,
  type LearnerCourse,
  type LearnerModule,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import { formatCourseHeading } from '../../utils/chapterLabel'
import { resolveVideoEmbed } from '../../utils/mediaEmbed'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'
import '../../styles/auth.css'
import '../../styles/learner.css'

const STANDALONE_CHAPTER = 'standalone'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

/** Détail cours code — même UX que le détail des leçons de conduite. */
export function StandaloneCourseDetailPage() {
  const navigate = useNavigate()
  const { courseId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const state = location.state as { course?: LearnerCourse; courses?: LearnerCourse[] } | null

  const [course, setCourse] = useState<LearnerCourse | null>(state?.course ?? null)
  const [courses, setCourses] = useState<LearnerCourse[]>(state?.courses ?? [])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!state?.course)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [accessBlocked, setAccessBlocked] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list =
        state?.courses?.length ? state.courses : await fetchRevisionCourses()
      setCourses(list)
      const found =
        list.find((item) => String(item.id) === String(courseId)) ??
        (await fetchRevisionCourse(courseId))
      setCourse(found)
      if (!found) {
        setError('Cours introuvable ou non publié')
        return
      }

      const progress = await fetchRevisionProgress(STANDALONE_CHAPTER)
      const ids = new Set(progress.map((entry) => String(entry.courseId)))
      setCompletedIds(ids)

      const foundIndex = list.findIndex((item) => String(item.id) === String(courseId))
      const unlocked = isCourseUnlocked(
        foundIndex,
        list[foundIndex - 1]?.id ? String(list[foundIndex - 1].id) : undefined,
        ids,
      )
      if (!unlocked) {
        setAccessBlocked(true)
        return
      }
      setAccessBlocked(false)

      if (ids.has(String(courseId))) {
        setSecondsRemaining(0)
        return
      }

      try {
        const session = await startRevisionCourseSession(STANDALONE_CHAPTER, courseId)
        setSecondsRemaining(session.alreadyCompleted ? 0 : session.secondsRemaining)
      } catch (sessionErr) {
        console.warn('Session cours:', sessionErr)
        setSecondsRemaining(0)
      }
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [courseId, state?.courses])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const courseIndex = useMemo(
    () => courses.findIndex((item) => String(item.id) === String(course?.id)),
    [courses, course?.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = course ? completedIds.has(String(course.id)) : false
  const canValidate = !isCompleted

  useEffect(() => {
    if (isCompleted || loading || accessBlocked) return
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isCompleted, loading, accessBlocked, courseId])

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault()
    if (!course || isCompleted || saving || !canValidate) return
    setSaving(true)
    setError(null)
    try {
      await markRevisionCourseCompleted(STANDALONE_CHAPTER, course.id)
      setCompletedIds((current) => new Set(current).add(course.id))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

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

  if (accessBlocked) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <PageNavbar
            title="Cours"
            icon={<BookOpen size={22} />}
            onBack={() => navigate('/code-de-la-route/cours')}
          />
          <div className="auth-card learner-card">
            <div className="learner-empty">
              <h2>Cours verrouillé</h2>
              <p className="subtitle">Terminez le cours précédent pour accéder à celui-ci.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={formatCourseHeading(courseIndex, course?.title ?? 'Cours')}
          icon={<BookOpen size={22} />}
          onBack={() => navigate('/code-de-la-route/cours')}
        />

        <header className="auth-header learner-header">
          <p className="learner-chapter-name">Cours</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {course?.modules.map((module: LearnerModule) => {
            const hasVideoLink = module.mediaType === 'video' && Boolean(module.videoUrl?.trim())
            const video = hasVideoLink ? resolveVideoEmbed(module.videoUrl) : null
            const moduleTitle = (module.title || module.name || '').trim()
            const showModuleTitle =
              moduleTitle.length > 0 &&
              moduleTitle.toLowerCase() !== (course.title || '').trim().toLowerCase()

            return (
              <article key={module.id} className="learner-module">
                {showModuleTitle ? <h3>{moduleTitle}</h3> : null}
                {video ? (
                  <div className="learner-media">
                    {video.kind === 'iframe' ? (
                      <iframe
                        title={moduleTitle || 'Vidéo'}
                        src={video.src}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        loading="eager"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <video src={mediaSrc(video.src)} controls playsInline preload="metadata" />
                    )}
                  </div>
                ) : null}
                {hasVideoLink && !video ? (
                  <p className="form-error">
                    Vidéo indisponible : le lien doit être un YouTube ou Vimeo valide.
                  </p>
                ) : null}
                {module.mediaType === 'image' && module.imageUrl ? (
                  <img
                    className="learner-image"
                    src={mediaSrc(module.imageUrl)}
                    alt={moduleTitle || ''}
                  />
                ) : null}
                {module.text ? (
                  <div
                    className="learner-richtext"
                    dangerouslySetInnerHTML={{ __html: module.text }}
                  />
                ) : null}
              </article>
            )
          })}

          {course && course.modules.length === 0 ? (
            <p className="subtitle">Aucun contenu dans ce cours pour le moment.</p>
          ) : null}

          {course ? (
            <form onSubmit={handleComplete} className="learner-actions">
              <p className="subtitle">
                {isCompleted
                  ? 'Cours validé. Le cours suivant est débloqué.'
                  : secondsRemaining > 0
                    ? `Restez au moins 5 minutes sur ce cours. Encore ${formatSeconds(secondsRemaining)}.`
                    : 'Vous pouvez maintenant valider ce cours.'}
              </p>
              <label
                className={`learner-check${isCompleted ? ' is-done' : ''}${
                  !canValidate && !isCompleted ? ' is-locked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  disabled={isCompleted || saving || !canValidate}
                  onChange={(e) => {
                    if (e.target.checked) void handleComplete(e)
                  }}
                />
                <span>
                  {isCompleted
                    ? 'Cours validé — vous pouvez continuer'
                    : !canValidate
                      ? `Attendez encore ${formatSeconds(secondsRemaining)}`
                      : 'J’ai terminé ce cours et je suis prêt pour la suite'}
                </span>
                {isCompleted ? <Check size={18} /> : null}
              </label>

              {isCompleted && nextCourse ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate(`/code-de-la-route/cours/${nextCourse.id}`, {
                      state: { course: nextCourse, courses },
                      replace: true,
                    })
                  }
                >
                  Cours suivant
                  <ChevronRight size={18} />
                </button>
              ) : null}

              {isCompleted && !nextCourse ? (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => navigate('/code-de-la-route/cours')}
                >
                  Retour aux cours
                </button>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
