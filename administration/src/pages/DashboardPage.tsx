import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  Car,
  CreditCard,
  Download,
  Filter,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { MiniDonut } from '../components/AdminCharts'
import { StatusBadge, type StatusTone } from '../components/StatusBadge'
import {
  fetchDashboardSummary,
  paymentStatusLabel,
  subscribeToDashboardPaymentEvents,
  type DashboardPayment,
  type DashboardSummary,
} from '../api/dashboard'
import type { AccessModuleKey, PaymentStatus } from '../api/accessRequests'
import { getAdminToken, isAuthError, useAdminAuth } from '../context/AdminAuthContext'

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
  payments: { pending: 0, recent: [] },
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

function paymentTone(status: PaymentStatus): StatusTone {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  return 'danger'
}

function learnerName(payment: DashboardPayment) {
  if (!payment.learner) return 'Apprenant'
  return `${payment.learner.firstName} ${payment.learner.lastName}`.trim() || 'Apprenant'
}

export function DashboardPage() {
  const { admin } = useAdminAuth()
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
  const pendingPaymentsTotal = summary.payments.pending + summary.accessRequests.pending

  const rows = useMemo(
    () => [
      {
        space: 'Demandes d’accès',
        indicator: `${summary.accessRequests.pending} en attente · ${summary.payments.pending} paiements`,
        tone: pendingPaymentsTotal > 0 ? ('warning' as const) : ('success' as const),
        badge: pendingPaymentsTotal > 0 ? 'À traiter' : 'À jour',
        access: 'Admin',
        to: '/demandes-acces',
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
        indicator: `${summary.conduite.reservationsPending} paiements en attente`,
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
    [summary, pendingPaymentsTotal],
  )

  return (
    <div className="dash-overview">
      <div className="dash-page-head">
        <header className="admin-module-header">
          <p className="admin-module-kicker">Aperçu général</p>
          <h1 className="admin-module-title">Tableau de bord</h1>
          <div className="admin-module-accent-row" aria-hidden>
            <span className="admin-module-accent is-green" />
            <span className="admin-module-accent is-gold" />
            <span className="admin-module-accent is-navy" />
          </div>
        </header>
        <div className="dash-page-actions">
          <span className={`dash-live-pill${liveConnected ? ' is-live' : ''}`}>
            <span className="dash-live-pill-dot" aria-hidden="true" />
            {liveConnected ? 'Paiements en direct' : 'Reconnexion…'}
          </span>
          <span className="dash-month-pill" style={{ textTransform: 'capitalize' }}>
            {monthLabel}
          </span>
          <button type="button" className="dash-export-btn" onClick={() => void load()}>
            <Download size={13} strokeWidth={2} />
            Actualiser
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="dash-stats" aria-label="Indicateurs">
        <div className="dash-hero-card">
          <div className="dash-hero-top">
            <div>
              <p className="dash-hero-label">Apprenants actifs</p>
              <p className="dash-hero-value">{loading ? '…' : summary.users.active}</p>
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
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Chiffre d&apos;affaires</p>
            <div className="dash-stat-icon is-green">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">{loading ? '…' : formatXof(summary.revenue.total)}</p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {formatXof(summary.revenue.month)} ce mois · {summary.revenue.transactions} paiements
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Paiements en attente</p>
            <div className="dash-stat-icon is-violet">
              <Wallet size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">{loading ? '…' : summary.payments.pending}</p>
          <div className="dash-stat-foot is-red">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.accessRequests.pending} demandes · {summary.conduite.reservationsPending} réservations
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Accès actifs</p>
            <div className="dash-stat-icon is-violet">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">{loading ? '…' : summary.accessRequests.active}</p>
          <div className="dash-stat-foot is-red">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.accessRequests.expired} expirés
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Leçons conduite</p>
            <div className="dash-stat-icon is-gold">
              <Car size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">{loading ? '…' : summary.conduite.courses}</p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.moniteursActive} moniteurs actifs
          </div>
        </div>
      </section>

      <section className="dash-secondary" aria-label="Compléments">
        <div className="dash-secondary-card">
          <div className="dash-donut-wrap">
            <MiniDonut pct={codePct} color="#00B050" />
          </div>
          <div>
            <p className="dash-stat-label">Chapitres code</p>
            <p className="dash-secondary-num">
              {loading ? '…' : summary.code.published}
              <span className="muted">/{summary.code.chapters}</span>
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
            <p className="dash-secondary-num">{loading ? '…' : summary.conduite.creneauxLibre}</p>
            <p className="dash-secondary-hint">disponibles</p>
          </div>
        </div>
      </section>

      <section className="dash-bottom dash-bottom-live">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Vue d&apos;ensemble</h3>
              <p>État de chaque espace</p>
            </div>
            <button type="button" className="dash-filter-btn">
              <Filter size={11} strokeWidth={2} /> Filtrer
            </button>
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
        </div>

        <div className="dash-panel dash-payments-panel">
          <div className="dash-panel-head">
            <div className="dash-payments-head-title">
              <Activity size={14} color="#00B050" strokeWidth={2} />
              <div>
                <h3>Paiements en temps réel</h3>
                <p>
                  {liveConnected ? 'Flux SSE connecté' : 'Connexion au flux…'}
                  {admin?.fullName ? ` · ${admin.fullName}` : ''}
                </p>
              </div>
            </div>
            <Link to="/demandes-acces" className="dash-filter-btn" style={{ textDecoration: 'none' }}>
              Voir tout
            </Link>
          </div>

          <div className="dash-activity-list">
            {loading && payments.length === 0 ? (
              <div className="dash-activity-item">
                <span className="dash-activity-dot" style={{ background: '#94a3b8' }} />
                <div>
                  <strong>Chargement…</strong>
                  <span>Récupération des derniers paiements</span>
                </div>
              </div>
            ) : payments.length === 0 ? (
              <div className="dash-activity-item">
                <span className="dash-activity-dot" style={{ background: '#00B050' }} />
                <div>
                  <strong>Aucun paiement récent</strong>
                  <span>Les nouveaux paiements apparaîtront ici automatiquement</span>
                </div>
              </div>
            ) : (
              payments.map((payment) => (
                <Link
                  key={payment.id}
                  to="/demandes-acces"
                  className="dash-activity-item dash-payment-item"
                >
                  <span
                    className="dash-activity-dot"
                    style={{
                      background:
                        payment.status === 'approved'
                          ? '#00B050'
                          : payment.status === 'pending'
                            ? '#FFC000'
                            : '#dc2626',
                    }}
                  />
                  <div>
                    <strong>{learnerName(payment)}</strong>
                    <span>
                      {formatXof(payment.amount)}
                      {payment.module ? ` · ${moduleLabels[payment.module] || payment.module}` : ''}
                      {` · ${payment.method === 'fedapay' ? 'Mobile Money' : 'Manuel'}`}
                    </span>
                    <small>
                      <StatusBadge tone={paymentTone(payment.status)}>
                        {paymentStatusLabel(payment.status)}
                      </StatusBadge>
                      {' · '}
                      {formatRelativeTime(payment.updatedAt || payment.createdAt)}
                    </small>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="dash-quick-links">
        {[
          { to: '/demandes-acces', label: 'Demandes d’accès' },
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
      </div>
    </div>
  )
}
