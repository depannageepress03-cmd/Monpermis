import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, ClipboardList } from 'lucide-react'
import { fetchHistory, fetchPendingReservations } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'

export function DashboardPage() {
  const { moniteur } = useMoniteurAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [historyCount, setHistoryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setError(null)
    try {
      const [pending, history] = await Promise.all([
        fetchPendingReservations(token),
        fetchHistory(token),
      ])
      setPendingCount(pending.reservations.length)
      setHistoryCount(history.reservations.length)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Portail moniteur</p>
          <h1>Bonjour {moniteur?.firstName || ''}</h1>
          <p className="admin-muted">Gérez vos créneaux et validez les demandes des apprenants.</p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="admin-stat-grid">
        <Link to="/a-confirmer" className="admin-stat-card">
          <CalendarClock size={22} />
          <strong>{pendingCount}</strong>
          <span>À confirmer</span>
        </Link>
        <Link to="/disponibilites" className="admin-stat-card">
          <CalendarDays size={22} />
          <strong>—</strong>
          <span>Mes disponibilités</span>
        </Link>
        <Link to="/historique" className="admin-stat-card">
          <ClipboardList size={22} />
          <strong>{historyCount}</strong>
          <span>Historique</span>
        </Link>
      </div>
    </div>
  )
}
