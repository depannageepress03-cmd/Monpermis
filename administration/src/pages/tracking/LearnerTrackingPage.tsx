import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock, Eye, Filter, Radar, RefreshCw, Search, Timer } from 'lucide-react'
import {
  fetchTrackAttemptTimeline,
  fetchTrackEvents,
  fetchTrackExamSessions,
  fetchTrackLearners,
  fetchTrackStats,
  type Pagination,
  type TrackEvent,
  type TrackExamSession,
  type TrackLearner,
} from '../../api/tracking'
import { StatusBadge } from '../../components/StatusBadge'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { Button, Drawer, EmptyState, SkeletonBlock } from '../../ui'

const EVENT_LABELS: Record<string, string> = {
  app_open: 'Ouverture de l’app',
  app_background: 'App en arrière-plan',
  app_foreground: 'App au premier plan',
  screen_view: 'Écran affiché',
  exam_start: 'Début d’examen',
  exam_answer: 'Réponse donnée',
  exam_skip: 'Question zappée',
  exam_quit: 'Examen quitté',
  exam_complete: 'Examen terminé',
  exam_pause: 'Pause',
  exam_resume: 'Reprise d’examen',
  test_start: 'Début sujet test',
  test_answer: 'Réponse (sujet)',
  test_skip: 'Question zappée (sujet)',
  test_complete: 'Sujet test terminé',
  practice_start: 'Début entraînement',
  practice_answer: 'Réponse (entraînement)',
  practice_skip: 'Question zappée (entraînement)',
  practice_complete: 'Entraînement terminé',
}

const EXAM_GROUP_EVENTS = new Set([
  'exam_start',
  'exam_answer',
  'exam_skip',
  'exam_quit',
  'exam_complete',
  'exam_pause',
  'exam_resume',
])

function eventLabel(event: string) {
  return EVENT_LABELS[event] || event
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m <= 0) return `${s}s`
  return `${m} min ${s}s`
}

function formatDelta(ms: number) {
  if (ms < 1000) return '0s'
  return formatDuration(ms / 1000)
}

function learnerName(user?: { firstName?: string; lastName?: string; phone?: string }) {
  if (!user) return '—'
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return name || user.phone || '—'
}

type Tab = 'exams' | 'events' | 'learners'

export function LearnerTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('exams')

  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchTrackStats>> | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [learners, setLearners] = useState<TrackLearner[]>([])
  const [learnerFilter, setLearnerFilter] = useState(() => searchParams.get('userId') || '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [examNumberFilter, setExamNumberFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [learnerSearch, setLearnerSearch] = useState('')

  const [exams, setExams] = useState<TrackExamSession[]>([])
  const [examsPagination, setExamsPagination] = useState<Pagination | null>(null)
  const [events, setEvents] = useState<TrackEvent[]>([])
  const [eventsPagination, setEventsPagination] = useState<Pagination | null>(null)
  const [learnersPage, setLearnersPage] = useState<Pagination | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [selectedAttempt, setSelectedAttempt] = useState<TrackExamSession | null>(null)
  const [timeline, setTimeline] = useState<TrackEvent[] | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      setStats(await fetchTrackStats(token))
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadLearners = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      const data = await fetchTrackLearners(token, { limit: 100 })
      setLearners(data.learners)
    } catch {
      setLearners([])
    }
  }, [])

  const loadData = useCallback(async (silent = false) => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    const params = {
      page,
      limit: 30,
      userId: learnerFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      examNumber: examNumberFilter || undefined,
      event: eventFilter || undefined,
    }
    try {
      if (tab === 'exams') {
        const data = await fetchTrackExamSessions(token, params)
        setExams(data.exams)
        setExamsPagination(data.pagination)
      } else if (tab === 'events') {
        const data = await fetchTrackEvents(token, params)
        setEvents(data.events)
        setEventsPagination(data.pagination)
      } else {
        const data = await fetchTrackLearners(token, { page, limit: 30, q: learnerSearch || undefined })
        setLearnersPage(data.pagination)
        setLearners((prev) => (page === 1 ? data.learners : prev))
      }
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [tab, page, learnerFilter, dateFrom, dateTo, examNumberFilter, eventFilter, learnerSearch])

  useEffect(() => {
    void loadStats()
    void loadLearners()
  }, [loadStats, loadLearners])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Sync filtre apprenant ↔ URL (?userId=)
  useEffect(() => {
    const fromUrl = searchParams.get('userId') || ''
    if (fromUrl && fromUrl !== learnerFilter) {
      setLearnerFilter(fromUrl)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (learnerFilter) next.set('userId', learnerFilter)
    else next.delete('userId')
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [learnerFilter, searchParams, setSearchParams])

  // Auto-refresh silencieux toutes les 8 s
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData
  const loadStatsRef = useRef(loadStats)
  loadStatsRef.current = loadStats
  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDataRef.current(true)
      void loadStatsRef.current()
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])

  const applyFilters = () => {
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [tab])

  const openTimeline = useCallback(async (session: TrackExamSession) => {
    const token = getAdminToken()
    if (!token) return
    setSelectedAttempt(session)
    setTimeline(null)
    setTimelineError(null)
    setTimelineLoading(true)
    try {
      const data = await fetchTrackAttemptTimeline(token, session.attemptId)
      setTimeline(data.events)
    } catch (err) {
      setTimelineError(isAuthError(err) ? err.message : 'Chronologie indisponible')
    } finally {
      setTimelineLoading(false)
    }
  }, [])

  const timelineDeltas = useMemo(() => {
    if (!timeline || timeline.length < 2) return []
    const out: number[] = []
    for (let i = 1; i < timeline.length; i++) {
      const prev = new Date(timeline[i - 1].createdAt).getTime()
      const curr = new Date(timeline[i].createdAt).getTime()
      out.push(Number.isFinite(prev) && Number.isFinite(curr) ? Math.max(0, curr - prev) : 0)
    }
    return out
  }, [timeline])

  const examStats = stats?.today?.exams

  return (
    <div className="tracking-page">
      <header className="admin-module-header">
        <div>
          <p className="admin-module-kicker">Traçage APK</p>
          <h1>Activité des apprenants</h1>
          <p className="admin-module-sub">
            Faits et gestes sur l’application mobile, avec un focus sur les examens blancs et
            examens blancs.
          </p>
        </div>
        <Button variant="primary" onClick={() => void loadData()}>
          <RefreshCw size={15} /> Actualiser
        </Button>
      </header>

      {statsLoading ? (
        <SkeletonBlock rows={1} />
      ) : stats ? (
        <div className="users-kpi-row">
          <div className="users-kpi is-navy">
            <span className="users-kpi-dot" />
            <div>
              <p className="users-kpi-label">Apprenants actifs aujourd’hui</p>
              <p className="users-kpi-value">{stats.today.activeLearners}</p>
            </div>
          </div>
          <div className="users-kpi is-muted">
            <span className="users-kpi-dot" />
            <div>
              <p className="users-kpi-label">Actions enregistrées aujourd’hui</p>
              <p className="users-kpi-value">{stats.today.events}</p>
            </div>
          </div>
          <div className="users-kpi is-success">
            <span className="users-kpi-dot" />
            <div>
              <p className="users-kpi-label">Examens démarrés / terminés</p>
              <p className="users-kpi-value">
                {examStats?.started ?? 0}
                <span className="users-kpi-sub"> / {examStats?.completed ?? 0}</span>
              </p>
            </div>
          </div>
          <div className="users-kpi is-muted">
            <span className="users-kpi-dot" />
            <div>
              <p className="users-kpi-label">Réussite aujourd’hui</p>
              <p className="users-kpi-value">
                {examStats?.passRate !== null && examStats?.passRate !== undefined
                  ? `${examStats.passRate}%`
                  : '—'}
              </p>
            </div>
          </div>
          <div className="users-kpi is-muted">
            <span className="users-kpi-dot" />
            <div>
              <p className="users-kpi-label">Durée moyenne d’examen</p>
              <p className="users-kpi-value">{formatDuration(examStats?.avgDurationSeconds)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="tracking-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'exams'}
          className={`tracking-tab${tab === 'exams' ? ' is-active' : ''}`}
          onClick={() => setTab('exams')}
        >
          <Eye size={15} /> Sessions d’examens
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'events'}
          className={`tracking-tab${tab === 'events' ? ' is-active' : ''}`}
          onClick={() => setTab('events')}
        >
          <Radar size={15} /> Fil des événements
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'learners'}
          className={`tracking-tab${tab === 'learners' ? ' is-active' : ''}`}
          onClick={() => setTab('learners')}
        >
          <Search size={15} /> Apprenants
        </button>
      </div>

      {tab !== 'learners' ? (
        <div className="tracking-filters">
          <label className="tracking-filter">
            <span>Apprenant</span>
            <select value={learnerFilter} onChange={(e) => setLearnerFilter(e.target.value)}>
              <option value="">Tous les apprenants</option>
              {learners.map((l) => (
                <option key={l.userId} value={l.userId}>
                  {learnerName(l)} {l.phone ? `· ${l.phone}` : ''}
                </option>
              ))}
            </select>
          </label>
          {tab === 'exams' ? (
            <label className="tracking-filter">
              <span>N° de sujet</span>
              <input
                type="number"
                min={1}
                placeholder="Tous"
                value={examNumberFilter}
                onChange={(e) => setExamNumberFilter(e.target.value)}
              />
            </label>
          ) : (
            <label className="tracking-filter">
              <span>Événement</span>
              <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option value="">Tous les événements</option>
                {Object.entries(EVENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="tracking-filter">
            <span>Du</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="tracking-filter">
            <span>Au</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <Button variant="primary" onClick={applyFilters} className="tracking-apply">
            <Filter size={14} /> Filtrer
          </Button>
        </div>
      ) : (
        <div className="tracking-filters">
          <label className="tracking-filter tracking-filter-grow">
            <span>Rechercher un apprenant</span>
            <input
              type="search"
              placeholder="Nom, téléphone, email…"
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
            />
          </label>
          <Button variant="primary" onClick={applyFilters} className="tracking-apply">
            <Search size={14} /> Rechercher
          </Button>
        </div>
      )}

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <SkeletonBlock rows={5} />
      ) : tab === 'exams' ? (
        <div className="admin-data-table-wrap">
          {exams.length === 0 ? (
            <EmptyState
              title="Aucune session d’examen"
              description="Les sessions apparaîtront ici dès que des apprenants passeront des examens blancs sur l’APK (version récente)."
            />
          ) : (
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Type</th>
                  <th>Sujet</th>
                  <th>Début</th>
                  <th>Durée</th>
                  <th>Réponses</th>
                  <th>Zappées</th>
                  <th>Quitté</th>
                  <th>Résultat</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr
                    key={e.attemptId}
                    className="tracking-row"
                    onClick={() => void openTimeline(e)}
                    title="Voir la chronologie détaillée"
                  >
                    <td>
                      <strong>{learnerName(e)}</strong>
                      {e.phone ? <span className="muted"> · {e.phone}</span> : null}
                    </td>
                    <td className="muted">
                      {e.examType === 'ecodepermis' ? 'Ancien examen' : 'Blanc'}
                    </td>
                    <td>{e.examNumber ?? '—'}</td>
                    <td className="muted">{formatDateTime(e.startAt)}</td>
                    <td className="muted">
                      <Timer size={12} /> {formatDuration(e.durationSeconds)}
                    </td>
                    <td>{e.answers}</td>
                    <td>{e.skips > 0 ? <span className="tracking-warn">{e.skips}</span> : e.skips}</td>
                    <td>
                      {e.quits > 0 ? (
                        <StatusBadge tone="danger">Quitté</StatusBadge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {e.completed && e.correct !== null ? (
                        <strong>
                          {e.correct}/{e.total ?? 20}
                        </strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {e.completed ? (
                        <StatusBadge tone={e.passed ? 'success' : 'danger'}>
                          {e.passed ? 'Réussi' : 'Raté'}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">En cours</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {examsPagination && examsPagination.pages > 1 ? (
            <PaginationBar pagination={examsPagination} onPage={setPage} />
          ) : null}
        </div>
      ) : tab === 'events' ? (
        <div className="admin-data-table-wrap">
          {events.length === 0 ? (
            <EmptyState
              title="Aucun événement"
              description="Aucune action enregistrée avec ces filtres."
            />
          ) : (
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Événement</th>
                  <th>Contexte</th>
                  <th>Détail</th>
                  <th>App</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="muted">{formatDateTime(ev.createdAt)}</td>
                    <td>
                      <span
                        className={`tracking-event tracking-event-${EXAM_GROUP_EVENTS.has(ev.event) ? 'exam' : 'other'}`}
                      >
                        {eventLabel(ev.event)}
                      </span>
                    </td>
                    <td className="muted">
                      <EventContext event={ev} />
                    </td>
                    <td className="muted">
                      <EventDetail event={ev} />
                    </td>
                    <td className="muted">
                      {ev.appVersion}
                      {ev.platform ? ` · ${ev.platform}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {eventsPagination && eventsPagination.pages > 1 ? (
            <PaginationBar pagination={eventsPagination} onPage={setPage} />
          ) : null}
        </div>
      ) : (
        <div className="admin-data-table-wrap">
          {learners.length === 0 ? (
            <EmptyState
              title="Aucun apprenant actif"
              description="Aucune action enregistrée sur l’APK pour le moment."
            />
          ) : (
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Dernière activité</th>
                  <th>Actions enregistrées</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l) => (
                  <tr key={l.userId}>
                    <td>
                      <strong>{learnerName(l)}</strong>
                      {l.email ? <span className="muted"> · {l.email}</span> : null}
                    </td>
                    <td className="muted">
                      <Clock size={12} /> {formatDateTime(l.lastActivity)}
                    </td>
                    <td>{l.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {learnersPage && learnersPage.pages > 1 ? (
            <PaginationBar pagination={learnersPage} onPage={setPage} />
          ) : null}
        </div>
      )}

      <Drawer
        open={Boolean(selectedAttempt)}
        onClose={() => setSelectedAttempt(null)}
        title={
          selectedAttempt
            ? `Sujet ${selectedAttempt.examNumber ?? '?'} — ${learnerName(selectedAttempt)}`
            : ''
        }
      >
        {selectedAttempt ? (
          <div className="tracking-timeline">
            <div className="tracking-timeline-meta">
              <span>
                {selectedAttempt.examType === 'ecodepermis' ? 'Ancien examen' : 'Examen blanc'}
              </span>
              <span>
                Début : {formatDateTime(selectedAttempt.startAt)}
              </span>
              <span>
                Durée : {formatDuration(selectedAttempt.durationSeconds)}
              </span>
              <span>Réponses : {selectedAttempt.answers}</span>
              <span>Zappées : {selectedAttempt.skips}</span>
              {selectedAttempt.quits > 0 ? (
                <span className="tracking-warn">
                  Quitté {selectedAttempt.quits} fois
                </span>
              ) : null}
              {selectedAttempt.completed ? (
                <span>
                  Note : {selectedAttempt.correct}/{selectedAttempt.total ?? 20}{' '}
                  {selectedAttempt.passed ? '(Réussi)' : '(Raté)'}
                </span>
              ) : null}
            </div>

            {timelineLoading ? (
              <SkeletonBlock rows={4} />
            ) : timelineError ? (
              <div className="form-error">{timelineError}</div>
            ) : timeline && timeline.length > 0 ? (
              <ol className="tracking-timeline-list">
                {timeline.map((ev, i) => {
                  const delta = timelineDeltas[i - 1] ?? 0
                  const longPause = delta > 120_000
                  return (
                    <li key={ev.id} className="tracking-timeline-item">
                      <span className="tracking-timeline-time">{formatTime(ev.createdAt)}</span>
                      <span className="tracking-timeline-dot" />
                      <div className="tracking-timeline-body">
                        <span
                          className={`tracking-event tracking-event-${EXAM_GROUP_EVENTS.has(ev.event) ? 'exam' : 'other'}`}
                        >
                          {eventLabel(ev.event)}
                        </span>
                        <span className="muted">
                          <EventDetail event={ev} />
                          {i > 0 ? (
                            <>
                              {' '}
                              · <CalendarDays size={11} /> après {formatDelta(delta)}
                            </>
                          ) : null}
                        </span>
                        {longPause ? (
                          <span className="tracking-long-pause">
                            Pause de plus de 2 minutes
                          </span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <EmptyState
                title="Chronologie vide"
                description="Aucun événement détaillé pour cette tentative."
              />
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}

function EventContext({ event }: { event: TrackEvent }) {
  const ctx = event.context || {}
  const parts: string[] = []
  if (ctx.screen) parts.push(`Écran : ${String(ctx.screen)}`)
  if (ctx.examType) parts.push(ctx.examType === 'ecodepermis' ? 'Ancien examen' : 'Blanc')
  if (ctx.examNumber !== undefined && ctx.examNumber !== null) parts.push(`Sujet ${ctx.examNumber}`)
  if (ctx.chapterId) parts.push(`Chapitre ${String(ctx.chapterId).slice(-6)}`)
  if (ctx.subjectNumber !== undefined && ctx.subjectNumber !== null) parts.push(`Sujet ${ctx.subjectNumber}`)
  if (ctx.mode) parts.push(ctx.mode === 'test' ? 'Test chapitre' : 'Entraînement')
  if (ctx.questionId) parts.push(`Q ${String(ctx.questionId).slice(-8)}`)
  return parts.length ? parts.join(' · ') : <span className="tracking-dim">—</span>
}

function EventDetail({ event }: { event: TrackEvent }) {
  const p = event.payload || {}
  const parts: string[] = []
  if (p.index !== undefined && p.index !== null) parts.push(`n° ${Number(p.index) + 1}`)
  if (typeof p.isCorrect === 'boolean') parts.push(p.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse')
  if (p.answeredCount !== undefined && p.answeredCount !== null) parts.push(`${p.answeredCount} réponses`)
  if (p.correct !== undefined && p.correct !== null && p.total !== undefined)
    parts.push(`Note ${p.correct}/${p.total}`)
  if (typeof p.passed === 'boolean') parts.push(p.passed ? 'Réussi' : 'Raté')
  if (p.count !== undefined && p.count !== null) parts.push(`${p.count} questions`)
  if (typeof p.elapsedMs === 'number' && p.elapsedMs >= 0) {
    parts.push(`${formatDuration(p.elapsedMs / 1000)} sur la question`)
  }
  return parts.length ? parts.join(' · ') : null
}

function PaginationBar({
  pagination,
  onPage,
}: {
  pagination: Pagination
  onPage: (page: number) => void
}) {
  const { page, pages, total } = pagination
  return (
    <div className="users-pagination">
      <span>
        {total} élément{total > 1 ? 's' : ''} · page {page}/{pages}
      </span>
      <div>
        <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Précédent
        </Button>
        <Button disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Suivant
        </Button>
      </div>
    </div>
  )
}
