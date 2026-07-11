import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, RefreshCw, Search } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchUserProgress,
  fetchUsers,
  type AppUser,
  type LearnerChapterProgress,
  type LearnerProgressDetail,
} from '../../api/users'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'

function statusLabel(status: string) {
  switch (status) {
    case 'locked':
      return 'Verrouillé'
    case 'not_started':
      return 'Non commencé'
    case 'in_progress':
      return 'En cours'
    case 'ready_for_test':
      return 'Prêt pour le test'
    case 'test_done':
      return 'Test validé'
    case 'chapter_done':
      return 'Terminé'
    default:
      return status
  }
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  switch (status) {
    case 'test_done':
    case 'chapter_done':
      return 'success'
    case 'in_progress':
    case 'ready_for_test':
      return 'warning'
    case 'locked':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function ChapterJourney({
  title,
  chapters,
  showTest,
}: {
  title: string
  chapters: LearnerChapterProgress[]
  showTest: boolean
}) {
  return (
    <section className="admin-panel learner-journey-section">
      <div className="admin-panel-head">
        <h3>{title}</h3>
        <span>{chapters.length} chapitre{chapters.length > 1 ? 's' : ''}</span>
      </div>
      {chapters.length === 0 ? (
        <p className="subtitle">Aucun chapitre publié.</p>
      ) : (
        <div className="learner-journey-chapters">
          {chapters.map((chapter, index) => (
            <article key={chapter.id} className="learner-journey-chapter">
              <div className="learner-journey-chapter-head">
                <div>
                  <strong>
                    {index + 1}. {chapter.name}
                  </strong>
                  <p>
                    {chapter.coursesCompleted}/{chapter.coursesTotal} cours
                    {showTest
                      ? chapter.test?.completed
                        ? ` · Test ${chapter.test.scoreLabel}`
                        : chapter.quizUnlocked
                          ? ' · Questions & test débloqués'
                          : ''
                      : ''}
                  </p>
                </div>
                <StatusBadge tone={statusTone(chapter.status)}>
                  {statusLabel(chapter.status)}
                </StatusBadge>
              </div>

              <ul className="learner-journey-courses">
                {chapter.courses.map((course, courseIndex) => (
                  <li key={course.id} className={course.completed ? 'is-done' : ''}>
                    <span>
                      Cours {courseIndex + 1} : {course.title}
                    </span>
                    <small>
                      {course.completed ? `Validé · ${formatDate(course.completedAt)}` : 'En attente'}
                    </small>
                  </li>
                ))}
              </ul>

              {showTest ? (
                <div className="learner-journey-quiz">
                  <div>
                    <strong>Questions</strong>
                    <small>{chapter.quizUnlocked ? 'Débloquées' : 'Verrouillées'}</small>
                  </div>
                  <div>
                    <strong>Sujet test</strong>
                    <small>
                      {chapter.test?.completed
                        ? `Validé · ${chapter.test.scoreLabel}`
                        : chapter.quizUnlocked
                          ? 'À passer'
                          : 'Verrouillé'}
                    </small>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function LearnerProgressListPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { users: data } = await fetchUsers(token)
      setUsers(data)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return users
    return users.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email} ${user.phone}`
        .toLowerCase()
        .includes(needle),
    )
  }, [users, query])

  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo="/code"
        backLabel="Code de la route"
        kicker="Suivi"
        title="Suivi de l’avancée des apprenants"
        subtitle="Consultez le parcours de chaque élève : cours, questions, sujets test et conduite."
      />

      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="users-toolbar" style={{ marginBottom: 12 }}>
          <label className="users-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un apprenant…"
            />
          </label>
          <button type="button" className="btn-outline" onClick={() => void load()}>
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>

        {loading ? <p className="subtitle">Chargement…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {!loading && !error ? (
          <div className="learner-progress-list">
            {filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                className="learner-progress-row"
                onClick={() => navigate(`/code/suivi-apprenants/${user.id}`)}
              >
                <span className="learner-progress-avatar">
                  {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                </span>
                <span className="learner-progress-meta">
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>{user.email}</small>
                </span>
                <StatusBadge tone={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Actif' : 'Suspendu'}
                </StatusBadge>
                <ChevronRight size={18} />
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="subtitle">Aucun apprenant trouvé.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function LearnerProgressDetailPage() {
  const { userId = '' } = useParams()
  const [data, setData] = useState<LearnerProgressDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const detail = await fetchUserProgress(token, userId)
      setData(detail)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => {
      void load()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [userId, load])

  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo="/code/suivi-apprenants"
        backLabel="Apprenants"
        kicker="Parcours élève"
        title={
          data
            ? `${data.user.firstName} ${data.user.lastName}`
            : loading
              ? 'Chargement…'
              : 'Apprenant'
        }
        subtitle={data?.user.email}
      />

      {loading && !data ? <p className="subtitle">Chargement du parcours…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {data ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button type="button" className="btn-outline" onClick={() => void load()}>
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>

          <div className="learner-journey-summary">
            <div className="admin-panel">
              <h3>Code de la route</h3>
              <p className="subtitle">
                {data.code.chaptersDone}/{data.code.chaptersTotal} chapitres validés
              </p>
              <strong>{data.code.currentStop?.label ?? '—'}</strong>
            </div>
            <div className="admin-panel">
              <h3>Conduite</h3>
              <p className="subtitle">
                {data.conduite.chaptersDone}/{data.conduite.chaptersTotal} chapitres terminés
              </p>
              <strong>{data.conduite.currentStop?.label ?? '—'}</strong>
            </div>
            <div className="admin-panel">
              <h3>Examens test (/20)</h3>
              {data.practiceExams ? (
                <p className="subtitle">
                  {data.practiceExams.completedCount}/{data.practiceExams.examTotal} passés ·{' '}
                  {data.practiceExams.passedCount} réussis (seuil {data.practiceExams.passScore}
                  /20)
                </p>
              ) : null}
              {!data.practiceExams || data.practiceExams.scores.length === 0 ? (
                <p className="subtitle">Aucune note d’examen test pour le moment.</p>
              ) : (
                <ul className="learner-score-list">
                  {data.practiceExams.scores.map((score) => (
                    <li key={score.id}>
                      <span>
                        Examen {score.examNumber}
                        {score.passed ? ' · Réussi' : ' · Non réussi'}
                      </span>
                      <strong>{score.scoreLabel}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-panel">
              <h3>Notes sujets chapitres</h3>
              {data.testScores.length === 0 ? (
                <p className="subtitle">Aucune note pour le moment.</p>
              ) : (
                <ul className="learner-score-list">
                  {data.testScores.map((score) => (
                    <li key={score.chapterId}>
                      <span>{score.chapterName}</span>
                      <strong>{score.scoreLabel}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <ChapterJourney title="Parcours code" chapters={data.code.chapters} showTest />
          <ChapterJourney title="Parcours conduite" chapters={data.conduite.chapters} showTest={false} />
        </>
      ) : null}

      {!loading && !error && !data ? (
        <p className="subtitle">
          Apprenant introuvable. <Link to="/code/suivi-apprenants">Retour</Link>
        </p>
      ) : null}
    </div>
  )
}
