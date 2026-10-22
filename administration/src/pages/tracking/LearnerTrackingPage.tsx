import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  Check,
  Clock,
  Eye,
  Filter,
  Radar,
  RefreshCw,
  Search,
  Timer,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import {
  fetchExamAttemptDetail,
  fetchExamAttempts,
  fetchTrackAttemptTimeline,
  fetchTrackEvents,
  fetchTrackLearners,
  fetchTrackStats,
  type ExamAttemptOutcome,
  type ExamAttemptQuestion,
  type ExamAttemptSummary,
  type Pagination,
  type TrackEvent,
  type TrackLearner,
} from '../../api/tracking'
import { QuestionReview } from '../../components/ExamQuestionReview'
import { PageSection } from '../../components/model/PageSection'
import { nf } from '../../components/model/ModelCharts'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { Drawer, EmptyState, SkeletonBlock } from '../../ui'

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

type QuestionFilter = 'all' | ExamAttemptQuestion['state']

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
  const [outcomeFilter, setOutcomeFilter] = useState<ExamAttemptOutcome | ''>('')
  const [learnerSearch, setLearnerSearch] = useState('')

  const [exams, setExams] = useState<ExamAttemptSummary[]>([])
  const [examsPagination, setExamsPagination] = useState<Pagination | null>(null)
  const [events, setEvents] = useState<TrackEvent[]>([])
  const [eventsPagination, setEventsPagination] = useState<Pagination | null>(null)
  const [learnersPage, setLearnersPage] = useState<Pagination | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptSummary | null>(null)
  const [detailQuestions, setDetailQuestions] = useState<ExamAttemptQuestion[] | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('all')
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
      outcome: outcomeFilter || undefined,
    }
    try {
      if (tab === 'exams') {
        const data = await fetchExamAttempts(token, params)
        setExams(data.attempts)
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
  }, [tab, page, learnerFilter, dateFrom, dateTo, examNumberFilter, eventFilter, outcomeFilter, learnerSearch])

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

  const loadAttemptDetail = useCallback(async (attemptId: string, silent = false) => {
    const token = getAdminToken()
    if (!token) return
    if (!silent) {
      setTimelineLoading(true)
      setDetailError(null)
      setTimelineError(null)
    }
    const [detail, events] = await Promise.allSettled([
      fetchExamAttemptDetail(token, attemptId),
      fetchTrackAttemptTimeline(token, attemptId),
    ])
    if (detail.status === 'fulfilled') {
      setSelectedAttempt((prev) => (prev && prev.attemptId === attemptId ? detail.value.attempt : prev))
      setDetailQuestions(detail.value.questions)
    } else if (!silent) {
      setDetailError(isAuthError(detail.reason) ? detail.reason.message : 'Détail de l’examen indisponible')
    }
    if (events.status === 'fulfilled') {
      setTimeline(events.value.events)
    } else if (!silent) {
      setTimelineError(isAuthError(events.reason) ? events.reason.message : 'Chronologie indisponible')
    }
    if (!silent) setTimelineLoading(false)
  }, [])

  const openAttempt = useCallback(
    (attempt: ExamAttemptSummary) => {
      setSelectedAttempt(attempt)
      setDetailQuestions(null)
      setTimeline(null)
      setQuestionFilter('all')
      void loadAttemptDetail(attempt.attemptId)
    },
    [loadAttemptDetail],
  )

  // Suivi en direct d'un examen en cours ouvert dans le panneau
  const liveAttemptId = selectedAttempt?.outcome === 'in_progress' ? selectedAttempt.attemptId : null
  useEffect(() => {
    if (!liveAttemptId) return
    const timer = window.setInterval(() => void loadAttemptDetail(liveAttemptId, true), 8000)
    return () => window.clearInterval(timer)
  }, [liveAttemptId, loadAttemptDetail])

  const questionCounts = useMemo(() => {
    const counts = { all: 0, correct: 0, wrong: 0, skipped: 0, unanswered: 0 }
    for (const q of detailQuestions ?? []) {
      counts.all++
      counts[q.state]++
    }
    return counts
  }, [detailQuestions])

  const visibleQuestions = useMemo(
    () => (detailQuestions ?? []).filter((q) => questionFilter === 'all' || q.state === questionFilter),
    [detailQuestions, questionFilter],
  )

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
  const passRate =
    examStats?.passRate !== null && examStats?.passRate !== undefined ? `${examStats.passRate}%` : '—'

  const outcomeChip = (e: ExamAttemptSummary) =>
    e.outcome === 'completed' ? (
      <span className={`cx-chip ${e.passed ? 'cx-green' : 'cx-red'}`}>Terminé · {e.passed ? 'Réussi' : 'Raté'}</span>
    ) : e.outcome === 'stopped' ? (
      <span className="cx-chip cx-amber">Arrêté à la question {Math.min(e.answered + 1, e.questionCount)}</span>
    ) : (
      <span className="cx-chip cx-blue">En cours</span>
    )

  return (
    <PageSection
      kicker="Traçage APK"
      title="Activité des apprenants"
      subtitle="Chaque examen blanc question par question : réponse choisie, bonne réponse, examen terminé ou arrêté en chemin, et note finale. Mise à jour automatique toutes les 8 secondes."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void loadData()}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      {statsLoading ? (
        <SkeletonBlock rows={2} />
      ) : stats ? (
        <div className="cx-kc-grid">
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-blue">
              <Users aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Apprenants actifs</span>
              <span className="cx-kc-value">{nf(stats.today.activeLearners)}</span>
              <span className="cx-kc-sub">aujourd’hui</span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-green">
              <Activity aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Actions enregistrées</span>
              <span className="cx-kc-value">{nf(stats.today.events)}</span>
              <span className="cx-kc-sub">aujourd’hui</span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-sky">
              <Eye aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Examens démarrés</span>
              <span className="cx-kc-value">
                {nf(examStats?.started ?? 0)} <small>/ {nf(examStats?.completed ?? 0)} terminés</small>
              </span>
              <span className="cx-kc-sub">durée moyenne {formatDuration(examStats?.avgDurationSeconds)}</span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-gold">
              <Trophy aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Réussite</span>
              <span className="cx-kc-value">{passRate}</span>
              <span className="cx-kc-sub">examens du jour</span>
            </div>
          </div>
        </div>
      ) : null}

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="cx-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'exams'} className={tab === 'exams' ? 'cx-active' : ''} onClick={() => setTab('exams')}>
              <Eye aria-hidden /> Examens blancs
            </button>
            <button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'cx-active' : ''} onClick={() => setTab('events')}>
              <Radar aria-hidden /> Fil des événements
            </button>
            <button type="button" role="tab" aria-selected={tab === 'learners'} className={tab === 'learners' ? 'cx-active' : ''} onClick={() => setTab('learners')}>
              <Search aria-hidden /> Apprenants
            </button>
          </div>
        </div>

        {tab !== 'learners' ? (
          <div className="cx-filter-bar" style={{ marginBottom: '1rem' }}>
            <label>
              Apprenant
              <select className="cx-select" value={learnerFilter} onChange={(e) => setLearnerFilter(e.target.value)}>
                <option value="">Tous les apprenants</option>
                {learners.map((l) => (
                  <option key={l.userId} value={l.userId}>
                    {learnerName(l)} {l.phone ? `· ${l.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {tab === 'exams' ? (
              <>
                <label>
                  N° de sujet
                  <input className="cx-input" type="number" min={1} placeholder="Tous" value={examNumberFilter} onChange={(e) => setExamNumberFilter(e.target.value)} />
                </label>
                <label>
                  Statut
                  <select
                    className="cx-select"
                    value={outcomeFilter}
                    onChange={(e) => {
                      setOutcomeFilter(e.target.value as ExamAttemptOutcome | '')
                      setPage(1)
                    }}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="completed">Terminé</option>
                    <option value="stopped">Arrêté en chemin</option>
                    <option value="in_progress">En cours</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                Événement
                <select className="cx-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                  <option value="">Tous les événements</option>
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Du
              <input className="cx-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label>
              Au
              <input className="cx-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <button type="button" className="cx-btn cx-btn-fill" onClick={applyFilters}>
              <Filter aria-hidden /> Filtrer
            </button>
          </div>
        ) : (
          <div className="cx-filter-bar" style={{ marginBottom: '1rem' }}>
            <label className="cx-grow">
              Rechercher un apprenant
              <input className="cx-input" type="search" placeholder="Nom, téléphone, email…" value={learnerSearch} onChange={(e) => setLearnerSearch(e.target.value)} />
            </label>
            <button type="button" className="cx-btn cx-btn-fill" onClick={applyFilters}>
              <Search aria-hidden /> Rechercher
            </button>
          </div>
        )}

        {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

        {loading ? (
          <SkeletonBlock rows={5} />
        ) : tab === 'exams' ? (
          <div className="cx-table-wrap">
            {exams.length === 0 ? (
              <EmptyState
                title="Aucun examen blanc"
                description="Les examens apparaîtront ici dès qu’un apprenant commencera un examen blanc sur l’application."
              />
            ) : (
              <table className="cx-data">
                <thead>
                  <tr>
                    <th>Apprenant</th>
                    <th>Sujet</th>
                    <th>Début</th>
                    <th>Dernière action</th>
                    <th>Durée</th>
                    <th>Progression</th>
                    <th>Bonnes</th>
                    <th>Fausses</th>
                    <th>Zappées</th>
                    <th>Note finale</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.attemptId} className="cx-click" onClick={() => openAttempt(e)} title="Voir chaque question et la réponse choisie">
                      <td>
                        <strong>{learnerName(e)}</strong>
                        {e.phone ? <span className="cx-dim"> · {e.phone}</span> : null}
                      </td>
                      <td>{e.examNumber}</td>
                      <td className="cx-dim">{formatDateTime(e.startAt)}</td>
                      <td className="cx-dim">{formatDateTime(e.lastAt)}</td>
                      <td className="cx-dim">
                        <Timer className="cx-ico-inline" aria-hidden /> {formatDuration(e.durationSeconds)}
                      </td>
                      <td>
                        <span className="cx-xr-score">
                          {e.answered}
                          <small>/{e.questionCount}</small>
                        </span>
                        <span className="cx-xr-bar" aria-hidden>
                          <span style={{ width: `${Math.min(100, (e.answered / Math.max(1, e.questionCount)) * 100)}%` }} />
                        </span>
                      </td>
                      <td>{e.correct}</td>
                      <td>{e.wrong - e.skipped > 0 ? <span className="cx-warn-n">{e.wrong - e.skipped}</span> : 0}</td>
                      <td>{e.skipped > 0 ? <span className="cx-warn-n">{e.skipped}</span> : 0}</td>
                      <td>
                        <span className="cx-xr-score">
                          {e.correct}
                          <small>/{e.total}</small>
                        </span>
                      </td>
                      <td>{outcomeChip(e)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {examsPagination && examsPagination.pages > 1 ? <PaginationBar pagination={examsPagination} onPage={setPage} /> : null}
          </div>
        ) : tab === 'events' ? (
          <div className="cx-table-wrap">
            {events.length === 0 ? (
              <EmptyState title="Aucun événement" description="Aucune action enregistrée avec ces filtres." />
            ) : (
              <table className="cx-data">
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
                      <td className="cx-dim">{formatDateTime(ev.createdAt)}</td>
                      <td>
                        <span className={`cx-evt${EXAM_GROUP_EVENTS.has(ev.event) ? ' cx-exam' : ''}`}>{eventLabel(ev.event)}</span>
                      </td>
                      <td className="cx-dim">
                        <EventContext event={ev} />
                      </td>
                      <td className="cx-dim">
                        <EventDetail event={ev} />
                      </td>
                      <td className="cx-dim">
                        {ev.appVersion}
                        {ev.platform ? ` · ${ev.platform}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {eventsPagination && eventsPagination.pages > 1 ? <PaginationBar pagination={eventsPagination} onPage={setPage} /> : null}
          </div>
        ) : (
          <div className="cx-table-wrap">
            {learners.length === 0 ? (
              <EmptyState title="Aucun apprenant actif" description="Aucune action enregistrée sur l’APK pour le moment." />
            ) : (
              <table className="cx-data">
                <thead>
                  <tr>
                    <th>Apprenant</th>
                    <th>Dernière activité</th>
                    <th>Actions enregistrées</th>
                  </tr>
                </thead>
                <tbody>
                  {learners.map((l) => (
                    <tr
                      key={l.userId}
                      className="cx-click"
                      title="Voir les examens de cet apprenant"
                      onClick={() => {
                        setLearnerFilter(l.userId)
                        setTab('exams')
                      }}
                    >
                      <td>
                        <strong>{learnerName(l)}</strong>
                        {l.email ? <span className="cx-dim"> · {l.email}</span> : null}
                      </td>
                      <td className="cx-dim">
                        <Clock className="cx-ico-inline" aria-hidden /> {formatDateTime(l.lastActivity)}
                      </td>
                      <td>{l.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {learnersPage && learnersPage.pages > 1 ? <PaginationBar pagination={learnersPage} onPage={setPage} /> : null}
          </div>
        )}
      </section>

      <Drawer
        wide
        open={Boolean(selectedAttempt)}
        onClose={() => setSelectedAttempt(null)}
        title={selectedAttempt ? `Examen blanc n° ${selectedAttempt.examNumber} — ${learnerName(selectedAttempt)}` : ''}
        subtitle={selectedAttempt ? `Commencé le ${formatDateTime(selectedAttempt.startAt)}` : undefined}
      >
        {selectedAttempt ? (
          <div>
            <AttemptVerdict attempt={selectedAttempt} />

            <div className="cx-xr-summary">
              <div className="cx-xr-stat">
                <span>Répondues</span>
                <strong>
                  {selectedAttempt.answered}/{selectedAttempt.questionCount}
                </strong>
              </div>
              <div className="cx-xr-stat">
                <span>Bonnes</span>
                <strong>{selectedAttempt.correct}</strong>
              </div>
              <div className="cx-xr-stat">
                <span>Fausses / zappées</span>
                <strong>
                  {selectedAttempt.wrong - selectedAttempt.skipped} / {selectedAttempt.skipped}
                </strong>
              </div>
              <div className="cx-xr-stat">
                <span>Durée</span>
                <strong>{formatDuration(selectedAttempt.durationSeconds)}</strong>
              </div>
            </div>

            <div className="cx-tl-meta">
              <span className="cx-chip">Dernière action : {formatDateTime(selectedAttempt.lastAt)}</span>
              {selectedAttempt.completedAt ? (
                <span className="cx-chip">Terminé le : {formatDateTime(selectedAttempt.completedAt)}</span>
              ) : null}
              {selectedAttempt.quits > 0 ? (
                <span className="cx-chip cx-red">A quitté l’examen {selectedAttempt.quits} fois</span>
              ) : null}
              <span className="cx-chip">
                Seuil de réussite : {selectedAttempt.passScore}/{selectedAttempt.total}
              </span>
            </div>

            <h3 className="cx-xr-section">Questions et réponses</h3>
            {timelineLoading && !detailQuestions ? (
              <SkeletonBlock rows={4} />
            ) : detailError ? (
              <p className="cx-note cx-note-err">{detailError}</p>
            ) : detailQuestions && detailQuestions.length > 0 ? (
              <>
                <div className="cx-xr-filter" role="group" aria-label="Filtrer les questions">
                  {(
                    [
                      ['all', 'Toutes'],
                      ['wrong', 'Fausses'],
                      ['correct', 'Bonnes'],
                      ['skipped', 'Zappées'],
                      ['unanswered', 'Non répondues'],
                    ] as [QuestionFilter, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`cx-btn cx-btn-sm${questionFilter === key ? ' cx-btn-fill' : ''}`}
                      onClick={() => setQuestionFilter(key)}
                      disabled={key !== 'all' && questionCounts[key] === 0}
                    >
                      {label} ({questionCounts[key]})
                    </button>
                  ))}
                </div>
                <ol className="cx-xr-list">
                  {visibleQuestions.map((q) => (
                    <QuestionReview key={q.questionId} question={q} />
                  ))}
                </ol>
              </>
            ) : (
              <EmptyState title="Aucune question" description="Les questions de cet examen n’ont pas pu être chargées." />
            )}

            <h3 className="cx-xr-section">Chronologie</h3>
            {timelineLoading && !timeline ? (
              <SkeletonBlock rows={4} />
            ) : timelineError ? (
              <p className="cx-note cx-note-err">{timelineError}</p>
            ) : timeline && timeline.length > 0 ? (
              <ol className="cx-tl">
                {timeline.map((ev, i) => {
                  const delta = timelineDeltas[i - 1] ?? 0
                  const longPause = delta > 120_000
                  return (
                    <li key={ev.id}>
                      <span className="cx-tl-time">{formatTime(ev.createdAt)}</span>
                      <span className="cx-tl-dot" />
                      <div className="cx-tl-body">
                        <span className={`cx-evt${EXAM_GROUP_EVENTS.has(ev.event) ? ' cx-exam' : ''}`} style={{ alignSelf: 'flex-start' }}>
                          {eventLabel(ev.event)}
                        </span>
                        <span>
                          <EventDetail event={ev} />
                          {i > 0 ? (
                            <>
                              {' '}
                              · <CalendarDays className="cx-ico-inline" aria-hidden /> après {formatDelta(delta)}
                            </>
                          ) : null}
                        </span>
                        {longPause ? <span className="cx-tl-pause">Pause de plus de 2 minutes</span> : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <EmptyState
                title="Chronologie vide"
                description="Aucun événement détaillé (application sans traçage ou examen ancien)."
              />
            )}
          </div>
        ) : null}
      </Drawer>
    </PageSection>
  )
}

function AttemptVerdict({ attempt }: { attempt: ExamAttemptSummary }) {
  const note = (
    <span className="cx-xr-note">
      {attempt.correct}/{attempt.total}
    </span>
  )
  if (attempt.outcome === 'completed') {
    return (
      <div className={`cx-xr-verdict ${attempt.passed ? 'cx-ok' : 'cx-ko'}`}>
        {attempt.passed ? <Check aria-hidden /> : <X aria-hidden />}
        <span>Examen terminé — note finale</span>
        {note}
        <span>{attempt.passed ? 'Réussi' : 'Raté'}</span>
      </div>
    )
  }
  const stoppedAt = Math.min(attempt.answered + 1, attempt.questionCount)
  if (attempt.outcome === 'stopped') {
    return (
      <div className="cx-xr-verdict cx-stop">
        <Clock aria-hidden />
        <span>
          Arrêté en chemin à la question {stoppedAt}/{attempt.questionCount} ({attempt.answered} réponse
          {attempt.answered > 1 ? 's' : ''}) — note au moment de l’arrêt
        </span>
        {note}
      </div>
    )
  }
  return (
    <div className="cx-xr-verdict cx-live">
      <Activity aria-hidden />
      <span>
        Examen en cours — question {stoppedAt}/{attempt.questionCount}, note provisoire
      </span>
      {note}
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
  return parts.length ? parts.join(' · ') : <span>—</span>
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
    <div className="cx-pager">
      <span>
        {total} élément{total > 1 ? 's' : ''} · page {page}/{pages}
      </span>
      <div>
        <button type="button" className="cx-btn cx-btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Précédent
        </button>
        <button type="button" className="cx-btn cx-btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Suivant
        </button>
      </div>
    </div>
  )
}
