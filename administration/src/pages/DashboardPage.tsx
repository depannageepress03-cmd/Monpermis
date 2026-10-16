import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Car,
  Check,
  CalendarDays,
  Coins,
  CreditCard,
  Landmark,
  Lightbulb,
  PieChart,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  Wallet,
} from 'lucide-react'
import {
  EvoChart,
  KpiCard,
  PanelHead,
  Ring,
  compactAmount,
  fcfa,
  nf,
  pctText,
  type EvoPoint,
} from '../components/model/ModelCharts'
import {
  fetchDashboardOverview,
  fetchDashboardSummary,
  paymentStatusLabel,
  subscribeToDashboardPaymentEvents,
  type DashboardOverview,
  type DashboardPayment,
  type DashboardSummary,
} from '../api/dashboard'
import {
  fetchCockpit,
  subscribeToActivityEvents,
  type ActivityEvent,
  type CockpitData,
} from '../api/activity'
import type { AccessModuleKey } from '../api/accessRequests'
import { paymentChannelLabel } from '../api/accessRequests'
import { getAdminToken, isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { actionLabel, formatAuditDate, resourceLabel } from '../utils/auditLabels'
import { roleLabel } from '../utils/roles'
import { SkeletonBlock } from '../ui'

const emptySummary: DashboardSummary = {
  users: { total: 0, active: 0, suspended: 0 },
  code: { chapters: 0, published: 0, courses: 0, questions: 0 },
  conduite: {
    chapters: 0,
    published: 0,
    courses: 0,
    moniteurs: 0,
    moniteursActive: 0,
    creneauxLibre: 0,
    reservations: 0,
    reservationsPending: 0,
    reservationsConfirmed: 0,
  },
  admins: { total: 0 },
  revenue: { currency: 'XOF', total: 0, month: 0, transactions: 0 },
  accessRequests: { active: 0, pending: 0, expired: 0 },
  payments: { pending: 0, needsRefund: 0, recent: [] },
}

const moduleLabels: Record<AccessModuleKey, string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  aiChat: 'Chat IA',
}

/** Couleurs des tranches de l'anneau (vert Monpermis en premier). */
const SLICE_COLORS = ['#00b050', '#0b2f6b', '#ffc000', '#35a4dd', '#e85d3b', '#8a9bb0']

type RangeKey = '7J' | '30J' | '3M' | '1A'
const RANGE_DAYS: Record<RangeKey, number> = { '7J': 7, '30J': 30, '3M': 90, '1A': 365 }

const addDays = (iso: string, n: number) => {
  const t = new Date(`${iso}T12:00:00`)
  t.setDate(t.getDate() + n)
  return t.toLocaleDateString('en-CA')
}
const frDate = (iso: string) => iso.split('-').reverse().join('/')
const monthName = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-15T12:00:00`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
const monthsBack = (iso: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = new Date(`${iso.slice(0, 7)}-15T12:00:00`)
    t.setMonth(t.getMonth() - (n - 1 - i))
    return t.toLocaleDateString('en-CA').slice(0, 7)
  })
const lastDayOf = (month: string) => {
  const t = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
  const day = t.toLocaleDateString('en-CA')
  const today = new Date().toLocaleDateString('en-CA')
  return day > today ? today : day
}

function formatRelativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}

function learnerName(payment: DashboardPayment) {
  if (!payment.learner) return 'Apprenant'
  return `${payment.learner.firstName} ${payment.learner.lastName}`.trim() || 'Apprenant'
}

function paymentOffer(payment: DashboardPayment) {
  if (payment.kind === 'reservation' || payment.reservationGroupId) return 'Réservation'
  const keys = payment.modules?.length ? payment.modules : payment.module ? [payment.module] : []
  if (!keys.length) return '—'
  return keys.map((key) => moduleLabels[key] ?? key).join(' + ')
}

function actorTag(type: ActivityEvent['actorType']) {
  if (type === 'admin') return { label: 'Admin', cls: 'cx-tag-admin' }
  if (type === 'user') return { label: 'Apprenant', cls: 'cx-tag-user' }
  return { label: 'Système', cls: '' }
}

function severityClass(severity: ActivityEvent['severity']) {
  if (severity === 'success') return 'cx-is-success'
  if (severity === 'warning') return 'cx-is-warning'
  if (severity === 'danger') return 'cx-is-danger'
  return ''
}

function feedTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return formatAuditDate(value)
}

function moduleIcon(key: string) {
  if (key === 'code') return <BookOpen aria-hidden />
  if (key === 'conduite_videos') return <Video aria-hidden />
  if (key === 'conduite_heures' || key === 'reservation') return <Car aria-hidden />
  return <Wallet aria-hidden />
}

type OutletCtx = { dashDate: string; setDashDate: (date: string) => void }

export function DashboardPage() {
  const navigate = useNavigate()
  const { canManageAdmins } = useAdminAuth()
  const { dashDate, setDashDate } = useOutletContext<OutletCtx>()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveConnected, setLiveConnected] = useState(false)
  const [range, setRange] = useState<RangeKey>('30J')
  const [detailsOpen, setDetailsOpen] = useState(false)
  // Direction (ex-cockpit) : réservé aux superadmins
  const [cockpit, setCockpit] = useState<CockpitData | null>(null)
  const [feed, setFeed] = useState<ActivityEvent[]>([])
  const [feedLive, setFeedLive] = useState(false)
  const [feedFilter, setFeedFilter] = useState<'all' | 'admin' | 'user'>('all')
  const refreshTimer = useRef<number | null>(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAdminToken()
      if (!token) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const [ov, sum, direction] = await Promise.all([
          fetchDashboardOverview(token, dashDate || undefined),
          fetchDashboardSummary(token),
          // Les données de direction sont facultatives : leur échec ne bloque pas le tableau de bord.
          canManageAdmins ? fetchCockpit(token).catch(() => null) : Promise.resolve(null),
        ])
        setOverview(ov.overview)
        setSummary(sum.summary)
        setPayments(sum.summary.payments?.recent ?? [])
        // Réponse incomplète : on n'affiche pas la section plutôt que de faire planter la page.
        if (direction?.admins && direction.activity && direction.users && direction.finances) {
          setCockpit(direction)
          setFeed(direction.activity.recent ?? [])
        }
      } catch (err) {
        if (!silent) setError(isAuthError(err) ? err.message : 'Impossible de charger le tableau de bord')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [dashDate, canManageAdmins],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!canManageAdmins) return
    const token = getAdminToken()
    if (!token) return
    return subscribeToActivityEvents(
      token,
      (activity) => {
        setFeed((prev) =>
          prev.some((e) => e.id === activity.id) ? prev : [activity, ...prev].slice(0, 80),
        )
        setCockpit((prev) =>
          prev ? { ...prev, activity: { ...prev.activity, today: prev.activity.today + 1 } } : prev,
        )
      },
      setFeedLive,
    )
  }, [canManageAdmins])

  const visibleFeed = useMemo(
    () => (feedFilter === 'all' ? feed : feed.filter((e) => e.actorType === feedFilter)),
    [feed, feedFilter],
  )

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => void load({ silent: true }), 800)
  }, [load])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    const unsubscribe = subscribeToDashboardPaymentEvents(
      token,
      (payment) => {
        setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)].slice(0, 20))
        scheduleSilentRefresh()
      },
      setLiveConnected,
    )
    return () => {
      unsubscribe()
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    }
  }, [scheduleSilentRefresh])

  const date = overview?.date ?? dashDate ?? ''

  const byDate = useMemo(() => new Map((overview?.daily ?? []).map((row) => [row.date, row])), [overview])

  const sumWindow = useCallback(
    (from: string, to: string) =>
      (overview?.daily ?? []).reduce((a, row) => (row.date >= from && row.date <= to ? a + row.ca : a), 0),
    [overview],
  )

  const points = useMemo<EvoPoint[]>(() => {
    if (!overview) return []
    if (range === '1A') {
      return monthsBack(overview.date, 12).map((mo) => {
        const v = overview.daily.filter((row) => row.date.slice(0, 7) === mo).reduce((a, row) => a + row.ca, 0)
        return {
          l: `${mo.slice(5)}/${mo.slice(2, 4)}`,
          d: new Date(`${mo}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          v,
        }
      })
    }
    const n = RANGE_DAYS[range]
    return Array.from({ length: n }, (_, i) => {
      const ds = addDays(overview.date, i - (n - 1))
      return { l: `${ds.slice(8)}/${ds.slice(5, 7)}`, d: frDate(ds), v: byDate.get(ds)?.ca ?? 0 }
    })
  }, [overview, range, byDate])

  const periodTotal = points.reduce((a, p) => a + p.v, 0)
  const previousTotal = useMemo(() => {
    if (!overview) return null
    const n = RANGE_DAYS[range]
    return sumWindow(addDays(overview.date, -(2 * n - 1)), addDays(overview.date, -n))
  }, [overview, range, sumWindow])
  const periodTrend =
    previousTotal && previousTotal > 0
      ? Math.round(((periodTotal - previousTotal) / previousTotal) * 1000) / 10
      : null

  const months = useMemo(
    () => (date ? monthsBack(new Date().toLocaleDateString('en-CA'), 12).reverse() : []),
    [date],
  )

  const byModule = overview?.byModule ?? []
  const moduleTotal = byModule.reduce((a, row) => a + row.ca, 0)
  const maxModule = Math.max(1, ...byModule.map((row) => row.ca))

  const lastPayments = payments.slice(0, 5)

  const kpi = overview?.kpi
  const share = kpi && kpi.month.count ? Math.round((kpi.day.count / kpi.month.count) * 100) : 0

  const insight =
    !kpi || kpi.month.trend === null
      ? 'Pas encore de mois précédent comparable : la tendance s’affichera dès qu’il y aura des paiements à comparer.'
      : `Le chiffre d’affaires de ${monthName(date)} est en ${kpi.month.trend >= 0 ? 'hausse' : 'baisse'} de ${String(Math.abs(kpi.month.trend)).replace('.', ',')} % par rapport au mois précédent sur la même période.`

  const detailRows = useMemo(
    () => [
      {
        space: 'Abonnés',
        indicator: `${summary.accessRequests.active} abonnements actifs · ${summary.revenue.transactions} paiements`,
        badge: `${summary.accessRequests.active} actifs`,
        to: '/abonnements',
      },
      {
        space: 'Code de la route',
        indicator: `${summary.code.chapters} chapitres · ${summary.code.questions} questions`,
        badge: `${summary.code.published} publiés`,
        to: '/code',
      },
      {
        space: 'Conduite',
        indicator: `${summary.conduite.courses} cours · ${summary.conduite.moniteursActive} moniteurs`,
        badge: summary.conduite.moniteursActive > 0 ? 'À jour' : 'Aucun moniteur actif',
        to: '/conduite',
      },
      {
        space: 'Réservations',
        indicator: `${summary.conduite.reservationsPending} en attente · ${summary.conduite.reservationsConfirmed} confirmées`,
        badge: summary.conduite.reservationsPending > 0 ? 'En attente' : 'À jour',
        to: '/conduite/reservations',
      },
      {
        space: 'Apprenants',
        indicator: `${summary.users.active} actifs sur ${summary.users.total}`,
        badge: summary.users.suspended > 0 ? `${summary.users.suspended} suspendus` : 'Actif',
        to: '/utilisateurs',
      },
    ],
    [summary],
  )

  const onMonthChange = (value: string) => setDashDate(lastDayOf(value))

  return (
    <>
      <header className="cx-page-header cx-welcome">
        <div className="cx-wl-txt">
          <small>BIENVENUE SUR VOTRE ESPACE</small>
          <h1>Monpermis Admin</h1>
          <p>Suivez l’évolution de vos abonnements et de vos paiements en temps réel.</p>
        </div>
        <div className="cx-wl-right">
          <p className="cx-wl-slogan">
            Une préparation efficace
            <br />
            pour réussir son permis
          </p>
          <div className="cx-page-actions">
            <label className="cx-date-pill cx-dp-chev cx-mob-date" title="Date du tableau de bord">
              <CalendarDays aria-hidden />
              <input
                type="date"
                value={date}
                max={new Date().toLocaleDateString('en-CA')}
                onChange={(e) => e.target.value && setDashDate(e.target.value)}
                aria-label="Date du tableau de bord"
              />
            </label>
            <span className={`cx-live${liveConnected ? ' is-live' : ''}`}>
              <i aria-hidden="true" />
              {liveConnected ? 'Paiements en direct' : 'Reconnexion…'}
            </span>
            <button type="button" className="cx-refresh" onClick={() => void load()}>
              <RefreshCw aria-hidden />
              Actualiser
            </button>
            {canManageAdmins ? (
              <Link to="/creer-admin" className="cx-refresh">
                <UserPlus aria-hidden />
                Nouvel admin
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading && !overview ? <SkeletonBlock rows={6} /> : null}

      {overview && kpi ? (
        <>
          <div className="cx-kc-grid">
            <KpiCard
              icon={<Coins aria-hidden />}
              tone="blue"
              label="CA du jour"
              value={nf(kpi.day.ca)}
              unit="FCFA"
              trend={kpi.day.trend}
              vs="vs la veille"
              spark={overview.spark.day}
              color="#0b2f6b"
            />
            <KpiCard
              icon={<Wallet aria-hidden />}
              tone="green"
              label="CA du mois"
              value={nf(kpi.month.ca)}
              unit="FCFA"
              trend={kpi.month.trend}
              vs="vs mois précédent"
              spark={overview.spark.month}
              color="#10a779"
            />
            <KpiCard
              icon={<CalendarDays aria-hidden />}
              tone="sky"
              label="CA de l’année"
              value={nf(kpi.year.ca)}
              unit="FCFA"
              trend={kpi.year.trend}
              vs={`vs ${Number(overview.year) - 1}`}
              spark={overview.spark.year}
              color="#35a4dd"
            />
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-gold">
                <CreditCard aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Paiements réussis</span>
                <span className="cx-kc-value">
                  {nf(kpi.day.count)} <small>/ {nf(kpi.month.count)}</small>
                </span>
                <span className="cx-kc-sub">{share} % des paiements du mois</span>
                <span className="cx-kc-bar">
                  <i style={{ width: `${Math.min(100, share)}%` }} />
                </span>
              </div>
            </div>
          </div>

          <div className="cx-dash-row">
            <section className="cx-panel cx-dash-chart">
              <PanelHead
                icon={<TrendingUp aria-hidden />}
                tile
                title="Évolution du chiffre d’affaires"
                sub="Sur la période choisie (en FCFA)"
                extra={
                  <div className="cx-seg" role="group" aria-label="Période du graphique">
                    {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={key === range ? 'cx-on' : ''}
                        aria-pressed={key === range}
                        onClick={() => setRange(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                }
              />
              <EvoChart points={points} />
              <div className="cx-evo-foot">
                <div className="cx-ef">
                  <span className="cx-ef-ic">
                    <Coins aria-hidden />
                  </span>
                  <div>
                    <small>Chiffre d’affaires total (période)</small>
                    <b>{fcfa(periodTotal)}</b>
                  </div>
                </div>
                <div className="cx-ef">
                  <span className="cx-ef-ic">
                    <TrendingUp aria-hidden />
                  </span>
                  <div>
                    <small>Évolution vs période précédente</small>
                    <b className={periodTrend !== null && periodTrend < 0 ? 'cx-neg' : 'cx-pos'}>
                      {periodTrend === null
                        ? 'sans comparaison'
                        : `${periodTrend >= 0 ? '↑ ' : '↓ '}${pctText(periodTrend)}`}
                    </b>
                  </div>
                </div>
              </div>
            </section>

            <section className="cx-panel cx-dash-donut">
              <PanelHead
                icon={<PieChart aria-hidden />}
                tile
                title="Répartition par offre"
                sub="CA du mois (en FCFA)"
                extra={
                  <label className="cx-mo-wrap">
                    <CalendarDays aria-hidden />
                    <select
                      className="cx-mo-sel"
                      aria-label="Mois"
                      value={overview.month}
                      onChange={(e) => onMonthChange(e.target.value)}
                    >
                      {months.map((mo) => (
                        <option key={mo} value={mo}>
                          {new Date(`${mo}-15`).toLocaleDateString('fr-FR', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              />
              {moduleTotal > 0 ? (
                <div className="cx-dn2">
                  <div className="cx-dn2-ring">
                    <Ring
                      label="Répartition du chiffre d'affaires par offre"
                      slices={byModule.map((row, i) => ({
                        l: row.label,
                        v: row.ca,
                        c: SLICE_COLORS[i % SLICE_COLORS.length],
                      }))}
                    />
                    <span className="cx-dn2-c">
                      <b>{compactAmount(moduleTotal)}</b>
                      <small>FCFA</small>
                      <hr />
                      <em>100 %</em>
                    </span>
                  </div>
                  <ul className="cx-dn2-leg">
                    {byModule.map((row, i) => (
                      <li key={row.key}>
                        <i style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                        <div>
                          <span>{row.label}</span>
                          <b>{nf(row.ca)} FCFA</b>
                        </div>
                        <em>{Math.round((row.ca / moduleTotal) * 100)}%</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="cx-muted">Aucun paiement ce mois.</p>
              )}
            </section>
          </div>

          <div className="cx-dash-row cx-dash-row2">
            <section className="cx-panel cx-dash-last">
              <PanelHead
                icon={<CreditCard aria-hidden />}
                title="Derniers paiements"
                sub="Opérations les plus récentes"
                extra={
                  <button type="button" className="cx-link-all" onClick={() => navigate('/abonnements?tab=payments')}>
                    Voir tout <ArrowRight aria-hidden />
                  </button>
                }
              />
              <div className="cx-table-wrap">
                <table className="cx-t2">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Apprenant</th>
                      <th>Offre</th>
                      <th>Moyen</th>
                      <th>Quand</th>
                      <th>Statut</th>
                      <th className="cx-n">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="cx-muted">
                          Aucun paiement récent
                        </td>
                      </tr>
                    ) : (
                      lastPayments.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{learnerName(p)}</td>
                          <td>{paymentOffer(p)}</td>
                          <td>{paymentChannelLabel(p)}</td>
                          <td>{formatRelativeTime(p.updatedAt || p.createdAt)}</td>
                          <td>
                            {p.status === 'approved' ? (
                              <span className="cx-chip-ok">
                                <Check aria-hidden />
                                {paymentStatusLabel(p.status)}
                              </span>
                            ) : (
                              <span className={`cx-chip-ok cx-chip-${p.status === 'pending' ? 'wait' : 'ko'}`}>
                                {paymentStatusLabel(p.status)}
                              </span>
                            )}
                          </td>
                          <td className="cx-n">{fcfa(p.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="cx-dash-side">
              <section className="cx-panel">
                <PanelHead
                  icon={<Wallet aria-hidden />}
                  title="Offres vendues"
                  sub={`Répartition du CA de ${monthName(date)}`}
                />
                {byModule.length ? (
                  <div className="cx-ct">
                    {byModule.map((row, i) => (
                      <div className="cx-ct-row" key={row.key}>
                        <span className="cx-ct-ic" style={{ color: SLICE_COLORS[i % SLICE_COLORS.length] }}>
                          {moduleIcon(row.key)}
                        </span>
                        <div className="cx-ct-mid">
                          <div className="cx-ct-top">
                            <span>{row.label}</span>
                            <em>{fcfa(row.ca)}</em>
                          </div>
                          <span className="cx-ct-bar">
                            <i
                              style={{
                                width: `${Math.max(3, (row.ca / maxModule) * 100)}%`,
                                background: SLICE_COLORS[i % SLICE_COLORS.length],
                              }}
                            />
                          </span>
                        </div>
                        <b>{Math.round((row.ca / moduleTotal) * 100)} %</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cx-muted">Aucune vente ce mois.</p>
                )}
              </section>
              <section className="cx-panel cx-retain">
                <span className="cx-rt-ico">
                  <Lightbulb aria-hidden />
                </span>
                <div>
                  <b>À retenir</b>
                  <p>{insight}</p>
                </div>
                <span className="cx-rt-tr">
                  <Sparkles aria-hidden />
                </span>
              </section>
            </div>
          </div>

          {canManageAdmins && cockpit ? (
            <>
              <p className="cx-section-label">Direction</p>
              <div className="cx-kc-grid">
                <Link to="/administrateurs" className="cx-kc cx-kc-link">
                  <span className="cx-kc-ico cx-kc-blue">
                    <Shield aria-hidden />
                  </span>
                  <div className="cx-kc-body">
                    <span className="cx-kc-label">Admins actifs</span>
                    <span className="cx-kc-value">{nf(cockpit.admins.active)}</span>
                    <span className="cx-kc-sub">
                      {cockpit.admins.total} comptes · {cockpit.admins.superadmins} super ·{' '}
                      {cockpit.admins.activeLast24h} actifs 24 h
                    </span>
                  </div>
                </Link>
                <Link to="/journal-audit" className="cx-kc cx-kc-link">
                  <span className="cx-kc-ico cx-kc-green">
                    <Activity aria-hidden />
                  </span>
                  <div className="cx-kc-body">
                    <span className="cx-kc-label">Activité aujourd’hui</span>
                    <span className="cx-kc-value">{nf(cockpit.activity.today)}</span>
                    <span className="cx-kc-sub">événements tracés</span>
                  </div>
                </Link>
                <Link to="/utilisateurs" className="cx-kc cx-kc-link">
                  <span className="cx-kc-ico cx-kc-sky">
                    <Users aria-hidden />
                  </span>
                  <div className="cx-kc-body">
                    <span className="cx-kc-label">Inscriptions</span>
                    <span className="cx-kc-value">{nf(cockpit.users.registeredToday)}</span>
                    <span className="cx-kc-sub">
                      apprenant{cockpit.users.registeredToday > 1 ? 's' : ''} inscrit
                      {cockpit.users.registeredToday > 1 ? 's' : ''} aujourd’hui
                    </span>
                  </div>
                </Link>
                <Link
                  to={cockpit.finances.needsRefund > 0 ? '/finances?tab=refunds' : '/finances'}
                  className={`cx-kc cx-kc-link${cockpit.finances.needsRefund > 0 ? ' cx-kc-alert' : ''}`}
                >
                  <span className={`cx-kc-ico ${cockpit.finances.needsRefund > 0 ? 'cx-kc-red' : 'cx-kc-gold'}`}>
                    <Landmark aria-hidden />
                  </span>
                  <div className="cx-kc-body">
                    <span className="cx-kc-label">À rembourser</span>
                    <span className="cx-kc-value">{nf(cockpit.finances.needsRefund)}</span>
                    <span className="cx-kc-sub">Ouvrir la file de remboursements</span>
                  </div>
                </Link>
              </div>

              <div className="cx-dash-row cx-dash-row2">
                <section className="cx-panel cx-dash-last">
                  <PanelHead
                    icon={<Activity aria-hidden />}
                    title="Activité en direct"
                    sub="Actions des admins et des apprenants"
                    extra={
                      <>
                        <span className={`cx-live-mini${feedLive ? ' is-live' : ''}`}>
                          <i aria-hidden="true" />
                          {feedLive ? 'Temps réel' : 'Reconnexion…'}
                        </span>
                        <div className="cx-seg cx-seg-sm" role="tablist" aria-label="Filtre d’activité">
                          {(
                            [
                              ['all', 'Tout'],
                              ['admin', 'Admins'],
                              ['user', 'Apprenants'],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              role="tab"
                              aria-selected={feedFilter === key}
                              className={feedFilter === key ? 'cx-on' : ''}
                              onClick={() => setFeedFilter(key)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    }
                  />
                  <div className="cx-feed">
                    {visibleFeed.length === 0 ? (
                      <p className="cx-empty">
                        Aucune activité pour ce filtre. Les événements apparaissent ici en direct.
                      </p>
                    ) : (
                      visibleFeed.map((event) => {
                        const tag = actorTag(event.actorType)
                        return (
                          <article
                            key={event.id}
                            className={`cx-feed-item ${severityClass(event.severity)}`.trim()}
                          >
                            <div className="cx-feed-top">
                              <span className={`cx-tag ${tag.cls}`.trim()}>{tag.label}</span>
                              <time dateTime={event.createdAt}>{feedTime(event.createdAt)}</time>
                            </div>
                            <p className="cx-feed-summary">
                              {event.summary ||
                                `${event.actorName} · ${actionLabel(event.action)} · ${resourceLabel(event.resource)}`}
                            </p>
                            <p className="cx-feed-meta">
                              <strong>{event.actorName || '—'}</strong>
                              {' · '}
                              {actionLabel(event.action)}
                              {' · '}
                              {resourceLabel(event.resource)}
                              {event.resourceId ? ` #${event.resourceId.slice(0, 8)}` : ''}
                            </p>
                          </article>
                        )
                      })
                    )}
                  </div>
                </section>

                <div className="cx-dash-side">
                  <section className="cx-panel">
                    <PanelHead
                      icon={<Shield aria-hidden />}
                      title="Équipe admin"
                      sub="Comptes récents"
                      extra={
                        <Link to="/administrateurs" className="cx-link-all">
                          Tout voir <ArrowRight aria-hidden />
                        </Link>
                      }
                    />
                    <div className="cx-adm-list">
                      {cockpit.admins.recent.length === 0 ? (
                        <p className="cx-empty">Aucun administrateur.</p>
                      ) : (
                        cockpit.admins.recent.map((member) => (
                          <Link key={member.id} to={`/administrateurs/${member.id}`} className="cx-adm-row">
                            <span className="cx-adm-avatar" aria-hidden>
                              {member.fullName
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                            <span className="cx-adm-meta">
                              <strong>{member.fullName}</strong>
                              <span>
                                {roleLabel(member.role)} · {member.phone}
                              </span>
                            </span>
                            <span className={`cx-chip-ok${member.isActive ? '' : ' cx-chip-ko'}`}>
                              {member.isActive ? 'Actif' : 'Suspendu'}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                    <Link to="/creer-admin" className="cx-btn-primary">
                      <UserPlus aria-hidden />
                      Créer un administrateur
                    </Link>
                  </section>
                </div>
              </div>
            </>
          ) : null}

          <details
            className="cx-more"
            open={detailsOpen}
            onToggle={(e) => setDetailsOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>Détails par espace : abonnements, contenus, réservations et apprenants</summary>
            <section className="cx-panel">
              <PanelHead
                icon={<Wallet aria-hidden />}
                title="Vue d’ensemble des espaces"
                sub="Indicateurs clés et accès direct à chaque espace"
              />
              <div className="cx-table-wrap">
                <table className="cx-t2">
                  <thead>
                    <tr>
                      <th>Espace</th>
                      <th>Indicateur</th>
                      <th>État</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row) => (
                      <tr key={row.space}>
                        <td>
                          <b>{row.space}</b>
                        </td>
                        <td>{row.indicator}</td>
                        <td>{row.badge}</td>
                        <td className="cx-n">
                          <Link to={row.to} className="cx-link-all">
                            Ouvrir <ArrowRight aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </details>
        </>
      ) : null}
    </>
  )
}
