import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  Car,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { MiniDonut } from '../components/AdminCharts'
import { StatusBadge } from '../components/StatusBadge'
import {
  fetchDashboardSummary,
  paymentStatusLabel,
  subscribeToDashboardPaymentEvents,
  type DashboardPayment,
  type DashboardSummary,
} from '../api/dashboard'
import type { AccessModuleKey } from '../api/accessRequests'
import { paymentChannelLabel } from '../api/accessRequests'
import { getAdminToken, isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { Reveal, Skeleton, SkeletonBlock } from '../ui'

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
  ecodepermis: 'E-Codepermis',
  aiChat: 'Chat IA',
}

function formatXof(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return `il y a ${days} j`
}

function learnerName(payment: DashboardPayment) {
  if (!payment.learner) return 'Apprenant'
  return `${payment.learner.firstName} ${payment.learner.lastName}`.trim() || 'Apprenant'
}

export function DashboardPage() {
  const { admin, canManageAdmins } = useAdminAuth()
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveConnected, setLiveConnected] = useState(false)
  const refreshTimer = useRef<number | null>(null)

  const applySummary = useCallback((next: DashboardSummary) => {
    setSummary(next)
    setPayments(next.payments?.recent ?? [])
  }, [])

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAdminToken()
      if (!token) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await fetchDashboardSummary(token)
        applySummary(data.summary)
      } catch (err) {
        if (!silent) {
          setError(isAuthError(err) ? err.message : 'Impossible de charger le résumé')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [applySummary],
  )

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => {
      void load({ silent: true })
    }, 800)
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return

    const unsubscribe = subscribeToDashboardPaymentEvents(
      token,
      (payment) => {
        setPayments((current) => {
          const without = current.filter((item) => item.id !== payment.id)
          return [payment, ...without].slice(0, 20)
        })
        scheduleSilentRefresh()
      },
      setLiveConnected,
    )

    return () => {
      unsubscribe()
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    }
  }, [scheduleSilentRefresh])

  const codePct =
    summary.code.chapters > 0
      ? Math.round((summary.code.published / summary.code.chapters) * 100)
      : 0

  const activationPct =
    summary.users.total > 0
      ? ((summary.users.active / summary.users.total) * 100).toFixed(1)
      : '0'

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const rows = useMemo(
    () => [
      {
        space: 'Abonnés',
        indicator: `${summary.accessRequests.active} abonnements actifs · ${summary.revenue.transactions} paiements`,
        tone: 'success' as const,
        badge: `${summary.accessRequests.active} actifs`,
        access: 'Admin',
        to: '/abonnements',
      },
      {
        space: 'Code de la route',
        indicator: `${summary.code.chapters} chapitres · ${summary.code.questions} questions`,
        tone: 'success' as const,
        badge: `${summary.code.published} publiés`,
        access: 'Publique',
        to: '/code',
      },
      {
        space: 'Conduite',
        indicator: `${summary.conduite.courses} cours · ${summary.conduite.moniteursActive} moniteurs`,
        tone: summary.conduite.moniteursActive > 0 ? ('success' as const) : ('warning' as const),
        badge: summary.conduite.moniteursActive > 0 ? 'À jour' : 'Aucun moniteur actif',
        access: 'Modules',
        to: '/conduite',
      },
      {
        space: 'Réservations',
        indicator: `${summary.conduite.reservationsPending} en attente`,
        tone: summary.conduite.reservationsPending > 0 ? ('warning' as const) : ('success' as const),
        badge: summary.conduite.reservationsPending > 0 ? 'En attente' : 'À jour',
        access: 'Admin',
        to: '/conduite/reservations',
      },
      {
        space: 'Utilisateurs',
        indicator: `${summary.users.active} apprenants actifs`,
        tone: summary.users.suspended > 0 ? ('danger' as const) : ('success' as const),
        badge: summary.users.suspended > 0 ? `${summary.users.suspended} suspendus` : 'Actif',
        access: 'Admin',
        to: '/utilisateurs',
      },
    ],
    [summary],
  )

  const approvedLivePayments = useMemo(
    () => payments.filter((payment) => payment.status === 'approved'),
    [payments],
  )

  return (
    <div className="dash-overview">
      <Reveal variant="blur" delay={0} className="dash-page-head">
        <header className="admin-module-header">
          <p className="admin-module-kicker">Exploitation</p>
          <h1 className="admin-module-title">Tableau de bord</h1>
          <p className="admin-module-subtitle" style={{ marginTop: 4 }}>
            {admin?.fullName ? `Bonjour ${admin.fullName.split(' ')[0]} — ` : ''}
            paiements live, abonnements et file ops.
          </p>
        </header>
        <div className="dash-page-actions">
          <span className={`dash-live-pill${liveConnected ? ' is-live' : ''}`}>
            <span className="dash-live-pill-dot" aria-hidden="true" />
            {liveConnected ? 'Paiements en direct' : 'Reconnexion…'}
          </span>
          <span className="dash-month-pill" style={{ textTransform: 'capitalize' }}>
            {monthLabel}
          </span>
          <button type="button" className="dash-export-btn ui-btn" onClick={() => void load()}>
            <RefreshCw size={13} strokeWidth={2} />
            Actualiser
          </button>
        </div>
      </Reveal>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="dash-stats" aria-label="Indicateurs">
        <Reveal variant="scale" delay={0} className="dash-hero-card">
          <div className="dash-hero-top">
            <div>
              <p className="dash-hero-label">Apprenants actifs</p>
              <p className="dash-hero-value">
                {loading ? <Skeleton height={36} width={80} /> : summary.users.active}
              </p>
            </div>
            <div className="dash-hero-delta">
              <TrendingUp size={12} strokeWidth={2.5} />
              {summary.users.total}
            </div>
          </div>
          <div className="dash-hero-meta">
            <div>
              <p className="dash-hero-meta-label">Inscrits</p>
              <p className="dash-hero-meta-value">{summary.users.total} comptes</p>
            </div>
            <div>
              <p className="dash-hero-meta-label">Taux activation</p>
              <p className="dash-hero-meta-value is-gold">{activationPct} %</p>
            </div>
          </div>
        </Reveal>

        <Reveal variant="scale" delay={60} className="dash-stat-card">
          {canManageAdmins ? (
            <>
              <div className="dash-stat-head">
                <p className="dash-stat-label">Chiffre d&apos;affaires</p>
                <div className="dash-stat-icon is-green">
                  <CreditCard size={14} strokeWidth={2} />
                </div>
              </div>
              <p className="dash-stat-num">
                {loading ? <Skeleton height={28} width={120} /> : formatXof(summary.revenue.total)}
              </p>
              <div className="dash-stat-foot is-green">
                <TrendingUp size={12} strokeWidth={2} />
                {formatXof(summary.revenue.month)} ce mois · {summary.revenue.transactions} paiements
              </div>
            </>
          ) : (
            <>
              <div className="dash-stat-head">
                <p className="dash-stat-label">À traiter</p>
                <div className="dash-stat-icon is-gold">
                  <Wallet size={14} strokeWidth={2} />
                </div>
              </div>
              <p className="dash-stat-num">
                {loading ? (
                  <Skeleton height={28} width={48} />
                ) : (
                  (summary.accessRequests?.pending ?? 0) +
                  (summary.conduite?.reservationsPending ?? 0)
                )}
              </p>
              <div className="dash-stat-foot is-green">Abonnés + réservations en attente</div>
            </>
          )}
        </Reveal>

        <Reveal variant="scale" delay={120} className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Paiements réussis</p>
            <div className="dash-stat-icon is-green">
              <Wallet size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? <Skeleton height={28} width={48} /> : summary.revenue.transactions}
          </p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {formatXof(summary.revenue.month)} ce mois
          </div>
        </Reveal>

        <Reveal variant="scale" delay={180} className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Abonnements actifs</p>
            <div className="dash-stat-icon is-gold">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? <Skeleton height={28} width={48} /> : summary.accessRequests.active}
          </p>
          <div className="dash-stat-foot is-red">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.accessRequests.expired} expirés
          </div>
        </Reveal>

        <Reveal variant="scale" delay={240} className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Leçons conduite</p>
            <div className="dash-stat-icon is-gold">
              <Car size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? <Skeleton height={28} width={48} /> : summary.conduite.courses}
          </p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.moniteursActive} moniteurs actifs
          </div>
        </Reveal>
      </section>

      <Reveal as="section" className="dash-secondary" delay={100}>
        <div className="dash-secondary-card">
          <div className="dash-donut-wrap">
            <MiniDonut pct={codePct} color="#00B050" />
          </div>
          <div>
            <p className="dash-stat-label">Chapitres code</p>
            <p className="dash-secondary-num">
              {loading ? (
                <Skeleton height={24} width={64} />
              ) : (
                <>
                  {summary.code.published}
                  <span className="muted">/{summary.code.chapters}</span>
                </>
              )}
            </p>
            <p className="dash-secondary-hint">
              {Math.max(summary.code.chapters - summary.code.published, 0)} en rédaction
            </p>
          </div>
        </div>

        <div className="dash-live-card">
          <div className="dash-live-icon">
            <Zap size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <p className="dash-stat-label">Créneaux libres</p>
            <p className="dash-secondary-num">
              {loading ? <Skeleton height={24} width={48} /> : summary.conduite.creneauxLibre}
            </p>
            <p className="dash-secondary-hint">disponibles</p>
          </div>
        </div>
      </Reveal>

      <section className="dash-bottom dash-bottom-live">
        <Reveal delay={140} className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Vue d&apos;ensemble</h3>
              <p>État de chaque espace</p>
            </div>
          </div>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Espace</th>
                  <th>Indicateur</th>
                  <th>Statut</th>
                  <th>Accès</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.space}>
                    <td>
                      <strong style={{ fontSize: 13, fontWeight: 600 }}>{row.space}</strong>
                    </td>
                    <td className="muted">{row.indicator}</td>
                    <td>
                      <StatusBadge tone={row.tone}>{row.badge}</StatusBadge>
                    </td>
                    <td>
                      <Link to={row.to} className="admin-access-pill">
                        {row.access}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={200} className="dash-panel dash-payments-panel">
          <div className="dash-panel-head">
            <div className="dash-payments-head-title">
              <Activity size={14} color="#00B050" strokeWidth={2} />
              <div>
                <h3>Paiements réussis</h3>
                <p>
                  {liveConnected ? 'Flux SSE connecté' : 'Connexion au flux…'}
                  {admin?.fullName ? ` · ${admin.fullName}` : ''}
                </p>
              </div>
            </div>
            <Link to="/abonnements?tab=payments" className="dash-filter-btn" style={{ textDecoration: 'none' }}>
              Voir tout
            </Link>
          </div>

          <div className="dash-activity-list">
            {loading && approvedLivePayments.length === 0 ? (
              <SkeletonBlock rows={3} />
            ) : approvedLivePayments.length === 0 ? (
              <div className="dash-activity-item">
                <span className="dash-activity-dot" style={{ background: '#00B050' }} />
                <div>
                  <strong>Aucun paiement réussi récent</strong>
                  <span>Les nouveaux paiements apparaîtront ici automatiquement</span>
                </div>
              </div>
            ) : (
              approvedLivePayments.map((payment) => {
                const modules =
                  payment.modules && payment.modules.length > 0
                    ? payment.modules
                    : payment.module
                      ? [payment.module]
                      : []
                const moduleText = modules.map((key) => moduleLabels[key] || key).join(' + ')
                return (
                  <Link
                    key={payment.id}
                    to="/abonnements?tab=payments"
                    className="dash-activity-item dash-payment-item"
                  >
                    <span
                      className="dash-activity-dot"
                      style={{ background: '#00B050' }}
                    />
                    <div>
                      <strong>{learnerName(payment)}</strong>
                      <span>
                        {formatXof(payment.amount)}
                        {moduleText ? ` · ${moduleText}` : ''}
                        {modules.length > 1 ? ` (${modules.length} offres)` : ''}
                        {` · ${paymentChannelLabel(payment)}`}
                      </span>
                      <small>
                        <StatusBadge tone="success">
                          {paymentStatusLabel(payment.status)}
                        </StatusBadge>
                        {' · '}
                        {formatRelativeTime(payment.updatedAt || payment.createdAt)}
                      </small>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </Reveal>
      </section>

      <Reveal delay={260} className="dash-quick-links">
        {[
          { to: '/abonnements', label: 'Abonnés' },
          { to: '/abonnements?tab=payments', label: 'Paiements réussis' },
          { to: '/code/revision-chapitres', label: 'Révision chapitres' },
          { to: '/conduite/lecons', label: 'Leçons conduite' },
          { to: '/conduite/reservations', label: 'Réservations' },
          { to: '/utilisateurs', label: 'Utilisateurs' },
          { to: '/annonces', label: 'Annonces' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="dash-quick-link">
            <ArrowUpRight size={12} strokeWidth={2} />
            {item.label}
          </Link>
        ))}
      </Reveal>
    </div>
  )
}
