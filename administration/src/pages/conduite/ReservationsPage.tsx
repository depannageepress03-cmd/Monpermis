import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock3, RefreshCw, Trash2, Wallet } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  deleteAdminReservation,
  fetchAdminReservations,
  fetchMoniteurs,
} from '../../api/reservations'
import { ConduiteSection } from '../../components/model/ConduiteSection'
import { fcfa, nf } from '../../components/model/ModelCharts'
import { EmptyState, SkeletonBlock } from '../../ui'
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

const TONE_CHIP: Record<string, string> = {
  'is-success': 'cx-green',
  'is-warning': 'cx-amber',
  'is-danger': 'cx-red',
  '': 'cx-slate',
}

function statusChip(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'confirmed':
    case 'confirmee':
    case 'confirmée':
      return 'cx-green'
    case 'pending':
    case 'en_attente':
      return 'cx-amber'
    case 'cancelled':
    case 'canceled':
    case 'annulee':
    case 'annulée':
    case 'no_show':
      return 'cx-red'
    case 'completed':
    case 'terminee':
    case 'terminée':
      return 'cx-blue'
    default:
      return 'cx-slate'
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

  const stats = useMemo(() => {
    let confirmed = 0
    let pending = 0
    let revenue = 0
    for (const reservation of reservations) {
      const key = String(reservation.status || '').toLowerCase()
      if (['confirmed', 'confirmee', 'confirmée', 'completed', 'terminee', 'terminée'].includes(key)) confirmed += 1
      if (['pending', 'en_attente'].includes(key) || reservation.paymentStatus === 'pending_validation') pending += 1
      if (reservation.paymentStatus === 'paid') revenue += reservation.priceFcfa || 0
    }
    return { total: reservations.length, confirmed, pending, revenue }
  }, [reservations])

  return (
    <ConduiteSection
      kicker="Gestion"
      title="Réservations"
      subtitle="Suivez les séances des élèves et leur statut de paiement."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <CalendarClock aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Réservations</span>
            <span className="cx-kc-value">{nf(stats.total)}</span>
            <span className="cx-kc-sub">au total</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Confirmées</span>
            <span className="cx-kc-value">{nf(stats.confirmed)}</span>
            <span className="cx-kc-sub">confirmées ou terminées</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">En attente</span>
            <span className="cx-kc-value">{nf(stats.pending)}</span>
            <span className="cx-kc-sub">à valider ou à payer</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <Wallet aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Encaissé</span>
            <span className="cx-kc-value">{nf(stats.revenue)}</span>
            <span className="cx-kc-sub">FCFA payés en Mobile Money</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <CalendarClock aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Séances des élèves</h2>
            <p className="cx-muted">
              {filteredReservations.length} sur {reservations.length} affichée
              {filteredReservations.length > 1 ? 's' : ''} · mise à jour automatique
            </p>
          </div>
        </div>

        <div className="cx-filters" style={{ marginBottom: '1rem' }}>
          <label>
            Moniteur
            <select className="cx-select" value={filterMoniteur} onChange={(e) => setFilterMoniteur(e.target.value)}>
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
            <select className="cx-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tous</option>
              <option value="confirmed">Confirmée</option>
              <option value="pending">En attente</option>
              <option value="cancelled">Annulée</option>
              <option value="completed">Terminée</option>
            </select>
          </label>
          <label>
            Paiement
            <select className="cx-select" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
              <option value="">Tous</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="unpaid">Non payé</option>
            </select>
          </label>
        </div>

        {queryFilter ? (
          <p className="cx-note cx-note-info" style={{ marginBottom: '.8rem' }}>
            Filtre de recherche : « {searchParams.get('q')} »
          </p>
        ) : null}

        {loading && reservations.length === 0 ? <SkeletonBlock rows={4} /> : null}
        {!loading && filteredReservations.length === 0 ? (
          <EmptyState
            title={reservations.length === 0 ? 'Aucune réservation' : 'Aucun résultat'}
            description={
              reservations.length === 0
                ? 'Dès qu’un élève confirme une séance, elle apparaît ici.'
                : 'Aucune réservation ne correspond aux filtres.'
            }
          />
        ) : null}

        <div className="cx-resv-list">
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
                : fcfa(reservation.priceFcfa || 0)

            return (
              <article key={String(reservation.id)} className="cx-resv">
                {reservation.moniteur?.vehiclePhotoUrl ? (
                  <img className="cx-resv-thumb" src={mediaSrc(reservation.moniteur.vehiclePhotoUrl)} alt="" />
                ) : (
                  <div className="cx-resv-thumb cx-empty-thumb">Séance</div>
                )}
                <div className="cx-resv-main">
                  <strong>{learner}</strong>
                  <span className="cx-resv-line">
                    <b>{when}</b>
                  </span>
                  <span className="cx-resv-line">
                    {reservation.moniteur?.fullName || 'Moniteur'}
                    {reservation.moniteur?.vehicleBrand ? ` · ${reservation.moniteur.vehicleBrand}` : ''}
                    {reservation.vehicleType ? ` · ${reservation.vehicleType}` : ''}
                  </span>
                  <span className="cx-resv-line">{priceLine}</span>
                  {reservation.paymentRef ? (
                    <span className="cx-resv-line">Réf. {reservation.paymentRef}</span>
                  ) : null}
                  {reservation.cancellationReason ? (
                    <span className="cx-resv-line">
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
                <div className="cx-resv-aside">
                  <span className={`cx-chip ${statusChip(reservation.status)}`}>{statusLabel(reservation.status)}</span>
                  <span className={`cx-chip ${TONE_CHIP[badge.tone] ?? 'cx-slate'}`}>{badge.label}</span>
                  <button
                    type="button"
                    className="cx-btn cx-btn-sm cx-btn-danger"
                    disabled={deletingReservationId === reservation.id}
                    onClick={() => void handleDeleteReservation(reservation)}
                    title="Supprimer la réservation"
                  >
                    <Trash2 aria-hidden />
                    {deletingReservationId === reservation.id ? '…' : 'Supprimer'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </ConduiteSection>
  )
}
