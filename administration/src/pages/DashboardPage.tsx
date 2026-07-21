import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  Car,
  CreditCard,
  Download,
  Filter,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { MiniDonut } from '../components/AdminCharts'
import { StatusBadge } from '../components/StatusBadge'
import { fetchDashboardSummary, type DashboardSummary } from '../api/dashboard'
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
  subscriptions: { active: 0, pending: 0, expired: 0 },
}

function formatXof(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

export function DashboardPage() {
  const { admin } = useAdminAuth()
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDashboardSummary(token)
      setSummary(data.summary)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Impossible de charger le résumé')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const codePct =
    summary.code.chapters > 0
      ? Math.round((summary.code.published / summary.code.chapters) * 100)
      : 0

  const activationPct =
    summary.users.total > 0
      ? ((summary.users.active / summary.users.total) * 100).toFixed(1)
      : '0'

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const rows = useMemo(() => [
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
      tone: summary.conduite.moniteursActive > 0 ? 'success' as const : 'warning' as const,
      badge: summary.conduite.moniteursActive > 0 ? 'À jour' : 'Aucun moniteur actif',
      access: 'Abonnés',
      to: '/conduite',
    },
    {
      space: 'Réservations',
      indicator: `${summary.conduite.reservationsPending} paiements en attente`,
      tone: summary.conduite.reservationsPending > 0 ? 'warning' as const : 'success' as const,
      badge: summary.conduite.reservationsPending > 0 ? 'En attente' : 'À jour',
      access: 'Admin',
      to: '/conduite/reservations',
    },
    {
      space: 'Utilisateurs',
      indicator: `${summary.users.active} apprenants actifs`,
      tone: summary.users.suspended > 0 ? 'danger' as const : 'success' as const,
      badge: summary.users.suspended > 0 ? `${summary.users.suspended} suspendus` : 'Actif',
      access: 'Admin',
      to: '/utilisateurs',
    },
  ], [summary])

  const activity = useMemo(() => [
    {
      user: admin?.fullName || 'Administrateur',
      action: `${summary.users.total} comptes inscrits`,
      time: 'données live',
      dot: '#00B050',
    },
    {
      user: 'Réservations',
      action: `${summary.conduite.reservationsPending} paiements en attente`,
      time: 'données live',
      dot: '#FFC000',
    },
    {
      user: 'Code',
      action: `${summary.code.published}/${summary.code.chapters} chapitres publiés`,
      time: 'données live',
      dot: '#00B050',
    },
    {
      user: 'Conduite',
      action: `${summary.conduite.creneauxLibre} créneaux libres`,
      time: 'données live',
      dot: '#FFC000',
    },
    ...(summary.users.suspended > 0
      ? [{
          user: 'Comptes',
          action: `${summary.users.suspended} comptes suspendus`,
          time: 'données live',
          dot: '#dc2626',
        }]
      : []),
  ], [admin, summary])

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
            <p className="dash-stat-label">Leçons conduite</p>
            <div className="dash-stat-icon is-gold">
              <Car size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? '…' : summary.conduite.courses}
          </p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.moniteursActive} moniteurs actifs
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Chiffre d&apos;affaires</p>
            <div className="dash-stat-icon is-green">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? '…' : formatXof(summary.revenue.total)}
          </p>
          <div className="dash-stat-foot is-green">
            <TrendingUp size={12} strokeWidth={2} />
            {formatXof(summary.revenue.month)} ce mois
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Abonnements actifs</p>
            <div className="dash-stat-icon is-violet">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? '…' : summary.subscriptions.active}
          </p>
          <div className="dash-stat-foot is-red">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.subscriptions.pending} en attente · {summary.subscriptions.expired} expirés
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-head">
            <p className="dash-stat-label">Paiements en attente</p>
            <div className="dash-stat-icon is-violet">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-stat-num">
            {loading ? '…' : summary.conduite.reservationsPending}
          </p>
          <div className="dash-stat-foot is-red">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.reservations} réservations
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
            <p className="dash-secondary-num">
              {loading ? '…' : summary.conduite.creneauxLibre}
            </p>
            <p className="dash-secondary-hint">disponibles</p>
          </div>
        </div>
      </section>

      <section className="dash-bottom">
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

        <div className="dash-panel">
          <div className="dash-panel-head" style={{ justifyContent: 'flex-start' }}>
            <Activity size={14} color="#00B050" strokeWidth={2} />
            <h3>Activité récente</h3>
          </div>
          <div className="dash-activity-list">
            {activity.map((a) => (
              <div key={`${a.user}-${a.action}`} className="dash-activity-item">
                <span className="dash-activity-dot" style={{ background: a.dot }} />
                <div>
                  <strong>{a.user}</strong>
                  <span>{a.action}</span>
                  <small>{a.time}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="dash-quick-links">
        {[
          { to: '/code/revision-chapitres', label: 'Révision chapitres' },
          { to: '/conduite/lecons', label: 'Leçons conduite' },
          { to: '/conduite/reservations', label: 'Réservations' },
          { to: '/utilisateurs', label: 'Utilisateurs' },
          { to: '/annonces', label: 'Annonces' },
          { to: '/creer-admin', label: 'Créer un admin' },
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
