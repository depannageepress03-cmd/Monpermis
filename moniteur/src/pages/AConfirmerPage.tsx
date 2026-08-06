import { useCallback, useEffect, useState } from 'react'
import {
  confirmReservation,
  fetchPendingReservations,
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

export function AConfirmerPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPendingReservations(token)
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
    const reason = window.prompt(
      'Motif du refus (optionnel) :',
      'Indisponible sur ce créneau',
    )
    if (reason === null) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await refuseReservation(token, item.id, reason)
      setSuccess(`Demande refusée. Le créneau a été libéré.`)
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
          <p className="admin-kicker">Validation</p>
          <h1>Rendez-vous à confirmer</h1>
          <p className="admin-muted">
            Paiement déjà reçu. Confirmez pour finaliser la séance, ou refusez pour libérer le
            créneau et déclencher le remboursement.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="admin-card">
          <p className="admin-muted">Aucune demande en attente.</p>
        </div>
      ) : null}

      <ul className="upcoming-list">
        {items.map((item) => (
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
            <div className="admin-actions-row">
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === item.id}
                onClick={() => void handleConfirm(item)}
              >
                Confirmer
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
          </li>
        ))}
      </ul>
    </div>
  )
}
