import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  cancelReservation,
  fetchMyReservations,
  ReservationError,
  type ReservationItem,
} from '../../api/reservations'
import { CancelReservationModal } from '../../components/CancelReservationModal'
import { EmptyState } from '../../components/EmptyState'
import { PageLoader } from '../../components/PageLoader'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { AppShell, userInitialsOf, type AppTab } from '../../components/layout/AppShell'
import { Badge, Button, Card, SectionTitle, StatCard } from '../../components/ui'
import '../../styles/auth.css'
import '../../styles/learner.css'
import '../../styles/reservation.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

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

function statusLabel(item: ReservationItem) {
  if (item.status === 'pending_moniteur') return 'En attente du moniteur'
  if (item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'Paiement en cours'
  return item.status
}

export function MesReservationsPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [items, setItems] = useState<ReservationItem[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMyReservations()
      setItems(data.reservations)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const submitCancel = async () => {
    if (!cancelTarget) return
    const reason = cancelReason.trim()
    if (reason.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères')
      return
    }
    setCancelling(true)
    setError(null)
    try {
      await cancelReservation(String(cancelTarget.id), reason)
      setCancelTarget(null)
      setCancelReason('')
      await load()
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Annulation impossible')
    } finally {
      setCancelling(false)
    }
  }

  if (loading || !user) return <PageLoader />

  const confirmed = items.filter((item) => item.status === 'confirmed')
  const awaitingMoniteur = items.filter((item) => item.status === 'pending_moniteur')
  const pending = items.filter(
    (item) => item.status === 'pending_payment' && item.paymentStatus !== 'paid',
  )

  return (
    <AppShell
      activeTab="conduite"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Mes réservations"
          icon={<CalendarCheck size={22} />}
          tone="drive"
          onBack={() => navigate('/conduite')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Historique</p>
          <p>Séances confirmées et paiements en cours. Annulation possible jusqu’à 24 h avant.</p>
        </header>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatCard icon={<CalendarCheck size={14} />} label="Confirmées" value={String(confirmed.length)} />
          <StatCard icon={<CalendarCheck size={14} />} label="En attente moniteur" value={String(awaitingMoniteur.length)} />
          <StatCard icon={<CalendarCheck size={14} />} label="En attente paiement" value={String(pending.length)} />
        </div>

        <Card className="conduite-card">
          {error ? <p className="form-error">{error}</p> : null}
          {busy ? <p className="subtitle">Chargement…</p> : null}

          {!busy && items.length === 0 ? (
            <EmptyState
              title="Aucune réservation"
              message="Vos séances confirmées apparaîtront ici après réservation."
              action={
                <Button
                  variant="cta"
                  tone="orange"
                  icon={<CalendarCheck size={16} />}
                  onClick={() => navigate('/conduite/reservation')}
                >
                  Réserver une séance
                </Button>
              }
            />
          ) : null}

          {!busy && confirmed.length > 0 ? (
            <section className="upcoming-block">
              <SectionTitle>Confirmées</SectionTitle>
              <ul className="upcoming-list">
                {confirmed.map((item) => (
                  <li key={String(item.id)}>
                    <Card>
                    <div className="upcoming-item-main">
                      <strong>
                        {item.creneau
                          ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                          : 'Séance'}
                      </strong>
                      <span>
                        {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                        <Badge tone="green">{statusLabel(item)}</Badge>
                      </span>
                    </div>
                    {item.canCancel ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError(null)
                          setCancelReason('')
                          setCancelTarget(item)
                        }}
                      >
                        Annuler
                      </Button>
                    ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!busy && awaitingMoniteur.length > 0 ? (
            <section className="upcoming-block" style={{ marginTop: '1.25rem' }}>
              <SectionTitle>En attente du moniteur</SectionTitle>
              <ul className="upcoming-list">
                {awaitingMoniteur.map((item) => (
                  <li key={String(item.id)}>
                    <Card>
                    <div className="upcoming-item-main">
                      <strong>
                        {item.creneau
                          ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                          : 'Séance'}
                      </strong>
                      <span>
                        {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                        <Badge tone="orange">{statusLabel(item)}</Badge>
                      </span>
                    </div>
                    {item.canCancel ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError(null)
                          setCancelReason('')
                          setCancelTarget(item)
                        }}
                      >
                        Annuler
                      </Button>
                    ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!busy && pending.length > 0 ? (
            <section className="upcoming-block" style={{ marginTop: '1.25rem' }}>
              <SectionTitle>En attente de paiement</SectionTitle>
              <ul className="upcoming-list">
                {pending.map((item) => (
                  <li key={String(item.id)}>
                    <Card>
                    <div className="upcoming-item-main">
                      <strong>
                        {item.creneau
                          ? `${formatDateLabel(item.creneau.date)} · ${item.creneau.startTime}`
                          : 'Séance'}
                      </strong>
                      <span>
                        {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                        <Badge tone="orange">{statusLabel(item)}</Badge>
                      </span>
                    </div>
                    {item.canCancel ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError(null)
                          setCancelReason('')
                          setCancelTarget(item)
                        }}
                      >
                        Annuler
                      </Button>
                    ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Button
            variant="cta"
            tone="orange"
            icon={<CalendarCheck size={16} />}
            style={{ marginTop: '1.25rem', width: '100%' }}
            onClick={() => navigate('/conduite/reservation')}
          >
            Nouvelle réservation
          </Button>
        </Card>
      </div>

      {cancelTarget ? (
        <CancelReservationModal
          target={cancelTarget}
          reason={cancelReason}
          cancelling={cancelling}
          onReasonChange={setCancelReason}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => void submitCancel()}
        />
      ) : null}
    </div>
    </AppShell>
  )
}
