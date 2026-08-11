import { useCallback, useEffect, useState } from 'react'
import { fetchHistory, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'

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

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmée'
  if (status === 'cancelled') return 'Annulée / refusée'
  if (status === 'completed') return 'Effectuée'
  return status
}

export function HistoriquePage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(token, status || undefined)
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Historique</p>
          <h1>Mes rendez-vous</h1>
          <p className="admin-muted">Confirmés, refusés et séances effectuées.</p>
        </div>
        <label>
          Statut
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées / refusées</option>
            <option value="completed">Effectuées</option>
          </select>
        </label>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="admin-card">
          <p className="admin-muted">Aucun rendez-vous dans cet historique.</p>
        </div>
      ) : null}

      <ul className="upcoming-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="upcoming-item-main">
              <strong>
                {item.creneau
                  ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                  : 'Séance'}
              </strong>
              <span>
                {item.user?.fullName || 'Apprenant'} · {statusLabel(item.status)} ·{' '}
                {(item.priceFcfa || 0).toLocaleString('fr-FR')} FCFA
              </span>
              {item.cancellationReason ? (
                <span className="admin-muted">{item.cancellationReason}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
