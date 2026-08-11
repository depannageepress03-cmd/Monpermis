import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Wallet,
} from 'lucide-react'
import { fetchDashboard, type DashboardData, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'

function formatMoney(value: number) {
  return `${(value || 0).toLocaleString('fr-FR')} FCFA`
}

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

function SessionRow({ item }: { item: ReservationItem }) {
  return (
    <li>
      <div className="upcoming-item-main">
        <strong>{item.user?.fullName || 'Apprenant'}</strong>
        <span>
          {item.creneau
            ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime} – ${item.creneau.endTime}`
            : 'Créneau'}
        </span>
        <span className="admin-muted">{formatMoney(item.priceFcfa)}</span>
      </div>
    </li>
  )
}

export function DashboardPage() {
  const { moniteur } = useMoniteurAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setError(null)
    try {
      setData(await fetchDashboard(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = data?.stats

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Portail moniteur</p>
          <h1>Bonjour {moniteur?.firstName || ''}</h1>
          <p className="admin-muted">
            Aujourd’hui, en attente, disponibilités et revenus — tout ce qui vous concerne.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="admin-stat-grid">
        <Link to="/reservations" className="admin-stat-card">
          <CalendarClock size={22} />
          <strong>{stats?.pending ?? '—'}</strong>
          <span>À confirmer</span>
        </Link>
        <Link to="/reservations" className="admin-stat-card">
          <CheckCircle2 size={22} />
          <strong>{stats?.confirmedUpcoming ?? '—'}</strong>
          <span>À venir</span>
        </Link>
        <Link to="/historique" className="admin-stat-card">
          <ClipboardList size={22} />
          <strong>{stats?.completed ?? '—'}</strong>
          <span>Séances effectuées</span>
        </Link>
        <Link to="/disponibilites" className="admin-stat-card">
          <CalendarDays size={22} />
          <strong>{stats?.weeklySlots ?? '—'}</strong>
          <span>Plages hebdo</span>
        </Link>
        <Link to="/revenus" className="admin-stat-card">
          <Wallet size={22} />
          <strong>{stats ? formatMoney(stats.outstanding) : '—'}</strong>
          <span>Reste à recevoir</span>
        </Link>
        <Link to="/revenus" className="admin-stat-card">
          <Wallet size={22} />
          <strong>{stats ? formatMoney(stats.monthEarned) : '—'}</strong>
          <span>Gains ce mois</span>
        </Link>
      </div>

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h3>Aujourd’hui</h3>
        {!data?.today?.length ? (
          <p className="admin-muted">Aucune séance confirmée aujourd’hui.</p>
        ) : (
          <ul className="upcoming-list">
            {data.today.map((item) => (
              <SessionRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <div className="admin-section-head" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>En attente de confirmation</h3>
          <Link to="/reservations">Voir tout</Link>
        </div>
        {!data?.pending?.length ? (
          <p className="admin-muted">Aucune demande en attente.</p>
        ) : (
          <ul className="upcoming-list">
            {data.pending.slice(0, 5).map((item) => (
              <SessionRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h3>Prochaines séances</h3>
        {!data?.upcoming?.length ? (
          <p className="admin-muted">Aucune séance confirmée à venir.</p>
        ) : (
          <ul className="upcoming-list">
            {data.upcoming.map((item) => (
              <SessionRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
