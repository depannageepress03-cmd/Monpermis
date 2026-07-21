import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchConduiteChapters,
  fetchConduiteProgress,
  fetchRevisionChapters,
  fetchRevisionProgress,
  markConduiteCourseCompleted,
  markRevisionCourseCompleted,
  startConduiteCourseSession,
  startRevisionCourseSession,
  type LearnerChapter,
  type LearnerCourse,
  type LearnerModule,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { CourseAiChatButton } from '../../components/CourseAiChat'
import { PageNavbar } from '../../components/PageNavbar'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'
import { resolveVideoEmbed } from '../../utils/mediaEmbed'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Track = 'revision' | 'conduite'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

export function LearnerCourseDetailPage({
  track,
  coursesBackTo,
}: {
  track: Track
  coursesBackTo: (chapterId: string) => string
}) {
  const navigate = useNavigate()
  const { chapterId = '', courseId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const state = location.state as
    | { chapter?: LearnerChapter; course?: LearnerCourse; courses?: LearnerCourse[] }
    | null

  const [chapterName, setChapterName] = useState(state?.chapter?.name ?? '')
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
      const chapters =
        track === 'revision' ? await fetchRevisionChapters() : await fetchConduiteChapters()
      const chapterIndex = chapters.findIndex((item) => item.id === chapterId)
      const chapter = chapterIndex >= 0 ? chapters[chapterIndex] : undefined
      if (!chapter) {
        setError('Chapitre introuvable')
        setCourse(null)
        return
      }
      setChapterName(`${chapterIndex + 1}. ${chapter.name}`)
      setCourses(chapter.courses)
      const found = chapter.courses.find((item) => item.id === courseId) ?? null
      setCourse(found)
      if (!found) {
        setError('Cours introuvable')
        return
      }
      const progress =
        track === 'revision'
          ? await fetchRevisionProgress(chapterId)
          : await fetchConduiteProgress(chapterId)
      const ids = new Set(progress.map((entry) => entry.courseId))
      setCompletedIds(ids)

      const foundIndex = chapter.courses.findIndex((item) => item.id === courseId)
      const unlocked = isCourseUnlocked(
        foundIndex,
        chapter.courses[foundIndex - 1]?.id,
        ids,
      )
      if (!unlocked) {
        setAccessBlocked(true)
        return
      }
      setAccessBlocked(false)

      if (ids.has(courseId)) {
        setSecondsRemaining(0)
        return
      }

      const session =
        track === 'revision'
          ? await startRevisionCourseSession(chapterId, courseId)
          : await startConduiteCourseSession(chapterId, courseId)
      setSecondsRemaining(session.alreadyCompleted ? 0 : session.secondsRemaining)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId, courseId, track])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const courseIndex = useMemo(
    () => courses.findIndex((item) => item.id === course?.id),
    [courses, course?.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = course ? completedIds.has(course.id) : false
  const allCompleted =
    courses.length > 0 && courses.every((item) => completedIds.has(item.id))
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
      if (track === 'revision') {
        await markRevisionCourseCompleted(chapterId, course.id)
      } else {
        await markConduiteCourseCompleted(chapterId, course.id)
      }
      setCompletedIds((current) => new Set(current).add(course.id))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) return null

  if (accessBlocked) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <PageNavbar
            title="Cours"
            icon={<BookOpen size={22} />}
            onBack={() => navigate(coursesBackTo(chapterId))}
            tone={track === 'conduite' ? 'drive' : 'default'}
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
          onBack={() => navigate(coursesBackTo(chapterId))}
          tone={track === 'conduite' ? 'drive' : 'default'}
        />

        <header className="auth-header learner-header">
          {chapterName ? (
            <p className="learner-chapter-name">{formatChapterHeading(chapterName)}</p>
          ) : null}
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {track === 'revision' && course ? (
            <CourseAiChatButton
              chapterId={chapterId}
              courseId={course.id}
              courseTitle={course.title}
            />
          ) : null}

          {course?.modules.map((module: LearnerModule) => {
            const video =
              module.mediaType === 'video' && module.videoUrl
                ? resolveVideoEmbed(module.videoUrl)
                : null

            return (
            <article key={module.id} className="learner-module">
              {(module.title || module.name) && (
                <h3>{module.title || module.name}</h3>
              )}
              {video ? (
                <div className="learner-media">
                  {video.kind === 'iframe' ? (
                    <iframe
                      title={module.title || 'Vidéo'}
                      src={video.src}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={mediaSrc(video.src)} controls playsInline />
                  )}
                </div>
              ) : null}
              {module.mediaType === 'image' && module.imageUrl ? (
                <img
                  className="learner-image"
                  src={mediaSrc(module.imageUrl)}
                  alt={module.title || ''}
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
                    navigate(
                      track === 'revision'
                        ? `/code-de-la-route/revision-chapitres/${chapterId}/cours/${nextCourse.id}`
                        : `/conduite/lecons/${chapterId}/cours/${nextCourse.id}`,
                      {
                        state: {
                          chapter: { id: chapterId, name: chapterName, order: 0, courses },
                          course: nextCourse,
                          courses,
                        },
                        replace: true,
                      },
                    )
                  }
                >
                  Cours suivant
                  <ChevronRight size={18} />
                </button>
              ) : null}

              {isCompleted && allCompleted && !nextCourse ? (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    navigate(
                      track === 'revision'
                        ? `/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`
                        : coursesBackTo(chapterId),
                      track === 'revision'
                        ? { state: { chapterName } }
                        : undefined,
                    )
                  }
                >
                  {track === 'revision' ? 'Accéder au sujet test' : 'Retour aux cours'}
                </button>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
