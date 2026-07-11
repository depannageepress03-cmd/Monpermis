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
import { MiniDonut, Sparkline } from '../components/AdminCharts'
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
}

function buildSpark(end: number, steps = 9) {
  const base = Math.max(end * 0.65, 1)
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const wobble = Math.sin(i * 1.7) * end * 0.03
    return Math.round(base + (end - base) * t + wobble)
  })
}

const ACTIVITY_FALLBACK = [
  { user: 'Système', action: 'Résumé du tableau de bord actualisé', time: 'à l’instant', dot: '#00B050' },
]

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

  const sparkUsers = useMemo(() => buildSpark(Math.max(summary.users.active, 1)), [summary.users.active])
  const sparkLessons = useMemo(
    () => buildSpark(Math.max(summary.conduite.courses || summary.conduite.chapters, 1)),
    [summary.conduite.courses, summary.conduite.chapters],
  )
  const sparkPay = useMemo(
    () => buildSpark(Math.max(summary.conduite.reservationsPending, 1)),
    [summary.conduite.reservationsPending],
  )

  const codePct =
    summary.code.chapters > 0
      ? Math.round((summary.code.published / summary.code.chapters) * 100)
      : 0

  const activationPct =
    summary.users.total > 0
      ? ((summary.users.active / summary.users.total) * 100).toFixed(1)
      : '0'

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const table: Array<{
    space: string
    indicator: string
    tone: 'success' | 'warning' | 'danger'
    badge: string
    access: string
    to: string
  }> = [
    {
      space: 'Code de la route',
      indicator: `${summary.code.chapters} chapitres · ${summary.code.questions} questions`,
      tone: 'success',
      badge: `${summary.code.published} publiés`,
      access: 'Publique',
      to: '/code',
    },
    {
      space: 'Conduite',
      indicator: `${summary.conduite.courses} cours · ${summary.conduite.moniteursActive} moniteurs`,
      tone: 'success',
      badge: 'À jour',
      access: 'Abonnés',
      to: '/conduite',
    },
    {
      space: 'Réservations',
      indicator: `${summary.conduite.reservationsPending} paiements en attente`,
      tone: summary.conduite.reservationsPending > 0 ? 'warning' : 'success',
      badge: summary.conduite.reservationsPending > 0 ? 'En attente' : 'À jour',
      access: 'Admin',
      to: '/conduite/reservations',
    },
    {
      space: 'Utilisateurs',
      indicator: `${summary.users.active} apprenants actifs`,
      tone: summary.users.suspended > 0 ? 'danger' : 'success',
      badge: summary.users.suspended > 0 ? `${summary.users.suspended} suspendus` : 'Actif',
      access: 'Admin',
      to: '/utilisateurs',
    },
  ]

  const activity = [
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
      ? [
          {
            user: 'Comptes',
            action: `${summary.users.suspended} comptes suspendus`,
            time: 'données live',
            dot: '#dc2626',
          },
        ]
      : ACTIVITY_FALLBACK),
  ]

  return (
    <div className="dash-overview">
      <div className="dash-page-head">
        <header className="admin-module-header">
          <p className="admin-module-kicker">Aperçu général</p>
          <h1 className="admin-module-title">Tableau de bord</h1>
          <div className="accent-row" aria-hidden>
            <span className="accent accent-green" />
            <span className="accent accent-gold" />
            <span className="accent accent-navy" />
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

      <section className="dash-bento" aria-label="Indicateurs">
        <div className="dash-hero">
          <div className="dash-hero-glow-a" />
          <div className="dash-hero-glow-b" />
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
          <div>
            <Sparkline data={sparkUsers} color="#00B050" fill />
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
        </div>

        <div className="dash-tile">
          <div className="dash-tile-head">
            <p className="dash-tile-label">Leçons conduite</p>
            <div className="dash-tile-icon is-gold">
              <Car size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-tile-value">
            {loading ? '…' : summary.conduite.courses || summary.conduite.chapters}
          </p>
          <div className="dash-tile-trend is-up">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.moniteursActive} moniteurs actifs
          </div>
          <Sparkline data={sparkLessons} color="#FFC000" fill />
        </div>

        <div className="dash-tile">
          <div className="dash-tile-head">
            <p className="dash-tile-label">Paiements en attente</p>
            <div className="dash-tile-icon is-violet">
              <CreditCard size={14} strokeWidth={2} />
            </div>
          </div>
          <p className="dash-tile-value">
            {loading ? '…' : summary.conduite.reservationsPending}
          </p>
          <div className="dash-tile-trend is-down">
            <TrendingUp size={12} strokeWidth={2} />
            {summary.conduite.reservations} réservations
          </div>
          <Sparkline data={sparkPay} color="#7c3aed" fill />
        </div>

        <div className="dash-tile-inline">
          <MiniDonut pct={codePct} color="#00B050" />
          <div>
            <p className="dash-tile-label">Chapitres code</p>
            <p className="dash-tile-value" style={{ fontSize: 20 }}>
              {loading ? '…' : summary.code.published}
              <span style={{ fontSize: 13, color: '#3d5a73', fontWeight: 500 }}>
                /{summary.code.chapters}
              </span>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#00B050', fontWeight: 600 }}>
              {Math.max(summary.code.chapters - summary.code.published, 0)} en rédaction
            </p>
          </div>
        </div>

        <div className="dash-tile-live">
          <div className="dash-tile-live-icon">
            <Zap size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <p className="dash-tile-label">Créneaux libres</p>
            <p className="dash-tile-value" style={{ fontSize: 22 }}>
              {loading ? '…' : summary.conduite.creneauxLibre}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#0a6b3a', fontWeight: 600 }}>
              disponibles
            </p>
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
                {table.map((row) => (
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
