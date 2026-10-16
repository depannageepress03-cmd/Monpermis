import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Radar, RefreshCw, Search } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchUserProgress,
  fetchUsers,
  type AppUser,
  type LearnerChapterProgress,
  type LearnerProgressDetail,
} from '../../api/users'
import { CodeSection } from '../../components/model/CodeSection'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'

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

function statusTone(status: string): 'green' | 'amber' | 'neutral' {
  switch (status) {
    case 'test_done':
    case 'chapter_done':
      return 'green'
    case 'in_progress':
    case 'ready_for_test':
      return 'amber'
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

const TONE_CLASS = { green: 'cx-green', amber: 'cx-amber', neutral: '' } as const

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
    <section className="cx-panel">
      <div className="cx-panel-head cx-ph cx-ph-plain">
        <div className="cx-ph-txt">
          <h2 className="cx-panel-title">{title}</h2>
          <p className="cx-muted">
            {chapters.length} chapitre{chapters.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {chapters.length === 0 ? (
        <p className="cx-empty">Aucun chapitre publié.</p>
      ) : (
        <div className="cx-journey">
          {chapters.map((chapter, index) => {
            const pct = chapter.coursesTotal
              ? Math.round((chapter.coursesCompleted / chapter.coursesTotal) * 100)
              : 0
            return (
              <article key={chapter.id} className="cx-j-chap">
                <div className="cx-j-head">
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
                  <span className={`cx-chip ${TONE_CLASS[statusTone(chapter.status)]}`.trim()}>
                    {statusLabel(chapter.status)}
                  </span>
                </div>

                <div className="cx-progress" style={{ marginTop: '.7rem' }} aria-hidden>
                  <i style={{ width: `${pct}%` }} />
                </div>

                <ul className="cx-j-courses">
                  {chapter.courses.map((course, courseIndex) => (
                    <li key={course.id} className={course.completed ? 'cx-done' : ''}>
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
                  <div className="cx-j-quiz">
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
            )
          })}
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
      `${user.firstName} ${user.lastName} ${user.email} ${user.phone}`.toLowerCase().includes(needle),
    )
  }, [users, query])

  return (
    <CodeSection
      kicker="Suivi"
      title="Suivi de l’avancée des apprenants"
      subtitle="Consultez le parcours de chaque élève : cours, questions, sujets test et conduite."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '.8rem' }}>
          <label className="cx-search">
            <Search aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, e-mail ou téléphone…"
              aria-label="Rechercher un apprenant"
            />
          </label>
          <span className="cx-chip">
            {filtered.length} / {users.length} apprenant{users.length > 1 ? 's' : ''}
          </span>
        </div>

        {loading ? <SkeletonBlock rows={6} /> : null}

        {!loading && !error ? (
          filtered.length === 0 ? (
            <EmptyState title="Aucun apprenant" description="Aucun apprenant ne correspond à cette recherche." />
          ) : (
            <div>
              {filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="cx-learner"
                  onClick={() => navigate(`/code/suivi-apprenants/${user.id}`)}
                >
                  <span className="cx-avatar">
                    {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                  </span>
                  <span className="cx-learner-meta">
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>{user.email}</small>
                  </span>
                  <span className={`cx-chip ${user.isActive ? 'cx-green' : 'cx-red'}`}>
                    {user.isActive ? 'Actif' : 'Suspendu'}
                  </span>
                  <ChevronRight aria-hidden />
                </button>
              ))}
            </div>
          )
        ) : null}
      </section>
    </CodeSection>
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
      setData(await fetchUserProgress(token, userId))
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

  // Rafraîchissement automatique : la progression change en direct pendant que l'élève révise.
  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [userId, load])

  const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0)

  return (
    <CodeSection
      kicker="Parcours élève"
      title={data ? `${data.user.firstName} ${data.user.lastName}` : loading ? 'Chargement…' : 'Apprenant'}
      subtitle={data?.user.email}
      actions={
        <>
          <Link to="/code/suivi-apprenants" className="cx-refresh">
            Tous les apprenants
          </Link>
          <Link to={`/activite-apprenants?userId=${encodeURIComponent(userId)}`} className="cx-refresh">
            <Radar aria-hidden />
            Activité APK / examens
          </Link>
          <button type="button" className="cx-refresh" onClick={() => void load()}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
        </>
      }
    >
      {loading && !data ? <SkeletonBlock rows={6} /> : null}
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

      {data ? (
        <>
          <div className="cx-grid-2">
            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Code de la route</h2>
                  <p className="cx-muted">
                    {data.code.chaptersDone}/{data.code.chaptersTotal} chapitres validés
                  </p>
                </div>
              </div>
              <div className="cx-progress" aria-hidden>
                <i style={{ width: `${pct(data.code.chaptersDone, data.code.chaptersTotal)}%` }} />
              </div>
              <span className="cx-big">{data.code.currentStop?.label ?? '—'}</span>
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Conduite</h2>
                  <p className="cx-muted">
                    {data.conduite.chaptersDone}/{data.conduite.chaptersTotal} chapitres terminés
                  </p>
                </div>
              </div>
              <div className="cx-progress cx-gold" aria-hidden>
                <i style={{ width: `${pct(data.conduite.chaptersDone, data.conduite.chaptersTotal)}%` }} />
              </div>
              <span className="cx-big">{data.conduite.currentStop?.label ?? '—'}</span>
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Examens test (/20)</h2>
                  {data.practiceExams ? (
                    <p className="cx-muted">
                      {data.practiceExams.completedCount}/{data.practiceExams.examTotal} passés ·{' '}
                      {data.practiceExams.passedCount} réussis (seuil {data.practiceExams.passScore}/20)
                    </p>
                  ) : null}
                </div>
              </div>
              {!data.practiceExams || data.practiceExams.scores.length === 0 ? (
                <p className="cx-panel-note">Aucune note d’examen test pour le moment.</p>
              ) : (
                <ul className="cx-scores">
                  {data.practiceExams.scores.map((score) => (
                    <li key={score.id}>
                      <span>
                        Examen {score.examNumber}{' '}
                        <span className={`cx-chip ${score.passed ? 'cx-green' : 'cx-red'}`}>
                          {score.passed ? 'Réussi' : 'Non réussi'}
                        </span>
                      </span>
                      <strong>{score.scoreLabel}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Notes des sujets de chapitre</h2>
                  <p className="cx-muted">Un sujet test par chapitre</p>
                </div>
              </div>
              {data.testScores.length === 0 ? (
                <p className="cx-panel-note">Aucune note pour le moment.</p>
              ) : (
                <ul className="cx-scores">
                  {data.testScores.map((score) => (
                    <li key={score.chapterId}>
                      <span>{score.chapterName}</span>
                      <strong>{score.scoreLabel}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <ChapterJourney title="Parcours code" chapters={data.code.chapters} showTest />
          <ChapterJourney title="Parcours conduite" chapters={data.conduite.chapters} showTest={false} />
        </>
      ) : null}

      {!loading && !error && !data ? (
        <p className="cx-note cx-note-info">
          Apprenant introuvable. <Link to="/code/suivi-apprenants">Retour à la liste</Link>
        </p>
      ) : null}
    </CodeSection>
  )
}
