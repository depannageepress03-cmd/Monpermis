import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  deleteAdminReservation,
  fetchAdminReservations,
  fetchMoniteurs,
} from '../../api/reservations'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Moniteur, ReservationAdmin } from '../../types/reservations'
import { resolveMediaUrl } from '../../utils/mediaUrl'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

function paymentBadge(reservation: ReservationAdmin) {
  if (reservation.heuresDebitees > 0) {
    return { label: 'Payé (solde d’heures)', tone: 'is-success' }
  }
  switch (reservation.paymentStatus) {
    case 'paid':
      return { label: 'Payé (Mobile Money)', tone: 'is-success' }
    case 'pending_validation':
      return { label: 'Paiement en attente', tone: 'is-warning' }
    case 'refunded':
      return { label: 'Remboursé', tone: '' }
    default:
      return { label: 'Non payé', tone: 'is-danger' }
  }
}

function statusLabel(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'confirmed':
    case 'confirmee':
    case 'confirmée':
      return 'Confirmée'
    case 'pending':
    case 'en_attente':
      return 'En attente'
    case 'cancelled':
    case 'canceled':
    case 'annulee':
    case 'annulée':
      return 'Annulée'
    case 'completed':
    case 'terminee':
    case 'terminée':
      return 'Terminée'
    case 'no_show':
      return 'Absent'
    default:
      return status || '—'
  }
}

function learnerName(reservation: ReservationAdmin) {
  if (!reservation.user) return 'Élève'
  return `${reservation.user.firstName} ${reservation.user.lastName}`
}

export function ReservationsPage() {
  const [searchParams] = useSearchParams()
  const queryFilter = (searchParams.get('q') || '').trim().toLowerCase()

  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [reservations, setReservations] = useState<ReservationAdmin[]>([])
  const [filterMoniteur, setFilterMoniteur] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const token = getAdminToken()
    if (!token) return
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const [moniteursData, reservationsData] = await Promise.all([
        fetchMoniteurs(token),
        fetchAdminReservations(token),
      ])
      setMoniteurs(moniteursData.moniteurs)
      setReservations(reservationsData.reservations || [])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 8000)
    return () => window.clearInterval(timer)
  }, [load])

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (filterMoniteur && reservation.moniteur?.id !== filterMoniteur) return false
      if (filterStatus) {
        const raw = String(reservation.status || '').toLowerCase()
        const normalized = statusLabel(reservation.status).toLowerCase()
        const wanted = filterStatus.toLowerCase()
        const aliases: Record<string, string[]> = {
          confirmed: ['confirmed', 'confirmée', 'confirmee'],
          pending: ['pending', 'en attente', 'en_attente'],
          cancelled: ['cancelled', 'canceled', 'annulée', 'annulee'],
          completed: ['completed', 'terminée', 'terminee'],
        }
        const accepted = aliases[wanted] || [wanted]
        if (!accepted.some((item) => raw === item || normalized === item)) return false
      }
      if (filterPayment) {
        const badge = paymentBadge(reservation)
        if (filterPayment === 'paid' && !badge.tone.includes('success')) return false
        if (filterPayment === 'pending' && badge.tone !== 'is-warning') return false
        if (filterPayment === 'unpaid' && badge.tone !== 'is-danger') return false
      }
      if (queryFilter) {
        const learner = learnerName(reservation).toLowerCase()
        const moniteur = (reservation.moniteur?.fullName || '').toLowerCase()
        if (!learner.includes(queryFilter) && !moniteur.includes(queryFilter)) return false
      }
      return true
    })
  }, [reservations, filterMoniteur, filterStatus, filterPayment, queryFilter])

  const handleDeleteReservation = async (reservation: ReservationAdmin) => {
    const token = getAdminToken()
    if (!token) return
    const label = reservation.creneau
      ? `${reservation.creneau.date} à ${reservation.creneau.startTime}`
      : 'cette réservation'
    const who = reservation.user
      ? `${reservation.user.firstName} ${reservation.user.lastName}`
      : 'l’élève'
    if (
      !window.confirm(
        `Supprimer la réservation de ${who} (${label}) ?\nLe créneau sera libéré.`,
      )
    ) {
      return
    }
    setDeletingReservationId(reservation.id)
    setError(null)
    try {
      await deleteAdminReservation(token, reservation.id)
      setSuccess('Réservation supprimée.')
      await load({ silent: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setDeletingReservationId(null)
    }
  }

  return (
    <div className="admin-page reserv-page">
      <AdminSectionHeader
        backTo="/conduite"
        backLabel="Conduite"
        kicker="Gestion"
        title="Réservations"
        subtitle="Suivez les séances élèves et leur statut de paiement."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Séances élèves</h3>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {loading ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
        <div className="admin-section-body">
          <div className="reserv-filters">
            <label>
              Moniteur
              <select
                value={filterMoniteur}
                onChange={(e) => setFilterMoniteur(e.target.value)}
              >
                <option value="">Tous</option>
                {moniteurs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Tous</option>
                <option value="confirmed">Confirmée</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulée</option>
                <option value="completed">Terminée</option>
              </select>
            </label>
            <label>
              Paiement
              <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
                <option value="">Tous</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="unpaid">Non payé</option>
              </select>
            </label>
          </div>

          {queryFilter ? (
            <p className="admin-muted" style={{ marginBottom: '0.75rem' }}>
              Filtre recherche : « {searchParams.get('q')} »
            </p>
          ) : null}

          {loading && reservations.length === 0 ? <p className="admin-empty">Chargement…</p> : null}
          {!loading && filteredReservations.length === 0 ? (
            <p className="admin-empty">
              {reservations.length === 0
                ? 'Aucune réservation pour le moment. Dès qu’un élève confirme une séance, elle apparaît ici.'
                : 'Aucune réservation ne correspond aux filtres.'}
            </p>
          ) : null}

          <div className="reserv-card-list">
            {filteredReservations.map((reservation) => {
              const badge = paymentBadge(reservation)
              const learner = learnerName(reservation)
              const when = reservation.creneau
                ? `${reservation.creneau.date} · ${reservation.creneau.startTime}${
                    reservation.creneau.endTime ? `–${reservation.creneau.endTime}` : ''
                  }`
                : 'Créneau —'
              const priceLine =
                reservation.heuresDebitees > 0
                  ? `${reservation.heuresDebitees} h débitée${reservation.heuresDebitees > 1 ? 's' : ''}`
                  : `${(reservation.priceFcfa || 0).toLocaleString('fr-FR')} FCFA`

              return (
                <article key={String(reservation.id)} className="reserv-card">
                  <div className="reserv-card-main">
                    {reservation.moniteur?.vehiclePhotoUrl ? (
                      <img
                        className="reserv-card-thumb"
                        src={mediaSrc(reservation.moniteur.vehiclePhotoUrl)}
                        alt=""
                      />
                    ) : (
                      <div className="reserv-card-thumb is-empty">Séance</div>
                    )}
                    <div className="reserv-card-text">
                      <strong>{learner}</strong>
                      <span className="reserv-card-line">{when}</span>
                      <span className="reserv-card-line">
                        {reservation.moniteur?.fullName || 'Moniteur'}
                        {reservation.moniteur?.vehicleBrand
                          ? ` · ${reservation.moniteur.vehicleBrand}`
                          : ''}
                        {reservation.vehicleType ? ` · ${reservation.vehicleType}` : ''}
                      </span>
                      <span className="reserv-card-line">{priceLine}</span>
                      {reservation.paymentRef ? (
                        <span className="admin-muted">Réf. {reservation.paymentRef}</span>
                      ) : null}
                      {reservation.cancellationReason ? (
                        <span className="admin-muted">
                          Motif d’annulation
                          {reservation.cancelledBy === 'learner'
                            ? ' (élève)'
                            : reservation.cancelledBy === 'admin'
                              ? ' (admin)'
                              : ''}
                          : {reservation.cancellationReason}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="reserv-card-aside">
                    <span className="admin-chip">{statusLabel(reservation.status)}</span>
                    <span className={`admin-chip ${badge.tone}`.trim()}>{badge.label}</span>
                    <button
                      type="button"
                      className="btn-outline-sm btn-danger-sm"
                      disabled={deletingReservationId === reservation.id}
                      onClick={() => void handleDeleteReservation(reservation)}
                      title="Supprimer la réservation"
                    >
                      <Trash2 size={15} />
                      {deletingReservationId === reservation.id ? '…' : 'Supprimer'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
