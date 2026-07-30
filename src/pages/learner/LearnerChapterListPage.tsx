import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ClipboardList, HelpCircle, Layers } from 'lucide-react'
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
  coursesPath: (chapterId: string) => string
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

  const showSectionIcons = track === 'revision' && questionsPath && testSubjectPath

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={navTitle || title}
          icon={track === 'conduite' ? <BookOpen size={22} /> : <Layers size={22} />}
          onBack={() => navigate(backTo)}
          tone={track === 'conduite' ? 'drive' : 'default'}
          backLabel={backLabel}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">{kicker}</p>
          <p>
            {showSectionIcons
              ? 'Suivez chaque chapitre dans l’ordre : cours, questions, puis sujet test pour progresser sereinement.'
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

                if (showSectionIcons) {
                  return (
                    <div key={chapter.id} className="learner-chapter-card">
                      <div className="learner-chapter-card-top">
                        <span className="learner-item-icon">{index + 1}</span>
                        <span className="learner-item-body">
                          <strong>{numberedName}</strong>
                          <small>
                            {testDone
                              ? `${chapter.courses.length} cours · Chapitre validé`
                              : `${chapter.courses.length} cours · Accès libre`}
                          </small>
                        </span>
                      </div>
                      <div className="learner-chapter-actions">
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
                        <Link
                          to={questionsPath!(chapter.id)}
                          state={{ chapterName: numberedName }}
                          className="learner-chapter-action"
                        >
                          <span className="learner-chapter-action-icon is-questions">
                            <HelpCircle size={15} />
                          </span>
                          <span>Questions</span>
                        </Link>
                        <Link
                          to={testSubjectPath!(chapter.id)}
                          state={{ chapterName: numberedName }}
                          className="learner-chapter-action"
                        >
                          <span className="learner-chapter-action-icon is-test">
                            <ClipboardList size={15} />
                          </span>
                          <span>Sujet test</span>
                        </Link>
                      </div>
                    </div>
                  )
                }

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
