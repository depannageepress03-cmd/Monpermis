import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  confirmReservation,
  fetchReservations,
  refuseReservation,
  type ReservationItem,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return date
  }
}

export function ReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'confirmed'>('pending')

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReservations(token, 'all_active')
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(
    () => items.filter((item) => item.status === 'pending_moniteur'),
    [items],
  )
  const confirmed = useMemo(
    () => items.filter((item) => item.status === 'confirmed'),
    [items],
  )
  const visible = tab === 'pending' ? pending : confirmed

  const handleConfirm = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await confirmReservation(token, item.id)
      setSuccess(`Réservation confirmée pour ${item.user?.fullName || 'l’apprenant'}.`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Confirmation impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleRefuse = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    const reason = window.prompt('Motif du refus (optionnel) :', 'Indisponible sur ce créneau')
    if (reason === null) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await refuseReservation(token, item.id, reason)
      setSuccess('Demande refusée. Le créneau a été libéré.')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Refus impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Réservations</p>
          <h1>Mes rendez-vous</h1>
          <p className="admin-muted">
            Validez les demandes payées, puis suivez vos séances confirmées.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="subscriptions-tabs" role="tablist" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={tab === 'pending' ? 'active' : ''}
          onClick={() => setTab('pending')}
        >
          À confirmer ({pending.length})
        </button>
        <button
          type="button"
          className={tab === 'confirmed' ? 'active' : ''}
          onClick={() => setTab('confirmed')}
        >
          Confirmées ({confirmed.length})
        </button>
      </div>

      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {!loading && visible.length === 0 ? (
        <div className="admin-card">
          <p className="admin-muted">
            {tab === 'pending' ? 'Aucune demande en attente.' : 'Aucune séance confirmée.'}
          </p>
        </div>
      ) : null}

      <ul className="upcoming-list">
        {visible.map((item) => (
          <li key={item.id} className="admin-card" style={{ listStyle: 'none', marginBottom: 12 }}>
            <div className="upcoming-item-main">
              <strong>{item.user?.fullName || 'Apprenant'}</strong>
              <span>
                {item.creneau
                  ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                  : 'Créneau indisponible'}
              </span>
              <span className="admin-muted">
                {item.user?.phone || item.user?.email || '—'} ·{' '}
                {(item.priceFcfa || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            {tab === 'pending' ? (
              <div className="admin-actions-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === item.id}
                  onClick={() => void handleConfirm(item)}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={busyId === item.id}
                  onClick={() => void handleRefuse(item)}
                >
                  Refuser
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
