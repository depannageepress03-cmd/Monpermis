import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, ClipboardList, HelpCircle, Layers } from 'lucide-react'
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

  const showQuizActions = Boolean(questionsPath || testSubjectPath)
  const coursesOnly = Boolean(coursesPath) && !showQuizActions
  const revisionQuiz = track === 'revision' && showQuizActions

  return (
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
          <p className="learner-kicker">{kicker}</p>
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
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Réessayer
              </button>
            </div>
          ) : null}
          {!loading && !error && chapters.length === 0 ? (
            <div className="learner-empty">
              <h2>Aucun chapitre publié</h2>
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
                    <div key={chapter.id} className="learner-chapter-card learner-chapter-card--revision">
                      {questionsTo ? (
                        <Link
                          to={questionsTo}
                          state={{ chapterName: numberedName }}
                          className="learner-chapter-card-top learner-chapter-card-top--link"
                        >
                          <span className="learner-item-icon">{index + 1}</span>
                          <span className="learner-item-body">
                            <strong>{chapter.name}</strong>
                            {testDone ? (
                              <small className="learner-status-pill">
                                <Check size={12} aria-hidden />
                                Test validé
                              </small>
                            ) : (
                              <small>Questions + sujet test</small>
                            )}
                          </span>
                          <span className="learner-chapter-chevron" aria-hidden>
                            ›
                          </span>
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
                    </div>
                  )
                }

                if (showQuizActions) {
                  return (
                    <div key={chapter.id} className="learner-chapter-card">
                      <div className="learner-chapter-card-top">
                        <span className="learner-item-icon">{index + 1}</span>
                        <span className="learner-item-body">
                          <strong>{numberedName}</strong>
                          <small>
                            {testDone ? 'Chapitre validé' : 'Questions + sujet test'}
                          </small>
                        </span>
                      </div>
                      <div className="learner-chapter-actions">
                        {coursesPath ? (
                          <Link
                            to={coursesPath(chapter.id)}
                            state={{ chapter: { ...chapter, name: numberedName } }}
                            className="learner-chapter-action"
                          >
                            <span className="learner-chapter-action-icon is-courses">
                              <BookOpen size={15} />
                            </span>
                            <span>Cours</span>
                          </Link>
                        ) : null}
                        {questionsPath ? (
                          <Link
                            to={questionsPath(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action"
                          >
                            <span className="learner-chapter-action-icon is-questions">
                              <HelpCircle size={15} />
                            </span>
                            <span>Questions</span>
                          </Link>
                        ) : null}
                        {testSubjectPath ? (
                          <Link
                            to={testSubjectPath(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action"
                          >
                            <span className="learner-chapter-action-icon is-test">
                              <ClipboardList size={15} />
                            </span>
                            <span>Sujet test</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  )
                }

                if (!coursesPath) return null

                return (
                  <Link
                    key={chapter.id}
                    to={coursesPath(chapter.id)}
                    state={{ chapter: { ...chapter, name: numberedName } }}
                    className="learner-item"
                  >
                    <span className="learner-item-icon">{index + 1}</span>
                    <span className="learner-item-body">
                      <strong>{numberedName}</strong>
                      <small>{chapter.courses.length} cours</small>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
