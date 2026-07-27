import { useCallback, useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ContentError,
  fetchRevisionChapters,
  fetchRevisionChapterTestSubjects,
  type LearnerTestSubjectSummary,
} from '../../api/content'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import '../../styles/auth.css'
import '../../styles/learner.css'

export function RevisionChapterTestSubjectsPage() {
  const navigate = useNavigate()
  const { chapterId = '' } = useParams()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || ''
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre')
  const [subjects, setSubjects] = useState<LearnerTestSubjectSummary[]>([])
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
      const data = await fetchRevisionChapterTestSubjects(chapterId)
      setSubjects(data.subjects || [])
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [chapterId, stateChapterName])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <p className="subtitle">Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Sujets test"
          icon={<ClipboardList size={22} />}
          onBack={() => navigate('/code-de-la-route/revision-chapitres')}
        />

        <header className="auth-header learner-header">
          <h1>{chapterName}</h1>
          <p>Choisissez un sujet. Chaque sujet contient un jeu de questions différent.</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && !error && subjects.length === 0 ? (
            <div className="learner-empty">
              <h2>Aucun sujet test</h2>
              <p className="subtitle">
                Aucune question publiée pour ce chapitre. Publiez des questions dans l’admin.
              </p>
            </div>
          ) : null}

          {!loading && !error && subjects.length > 0 ? (
            <div className="learner-chapter-actions" style={{ display: 'grid', gap: 12 }}>
              {subjects.map((subject) => (
                <Link
                  key={subject.id || subject.number}
                  className="btn-primary"
                  to={`/code-de-la-route/revision-chapitres/${chapterId}/sujet-test/${subject.number}`}
                  state={{ chapterName }}
                  style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none' }}
                >
                  <span>{subject.label}</span>
                  <span>
                    {subject.questionCount} question{subject.questionCount !== 1 ? 's' : ''}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
