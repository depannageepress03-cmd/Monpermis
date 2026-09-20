import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CalendarPlus, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  cancelReservation,
  fetchDrivingDashboard,
  ReservationError,
  type DrivingProgress,
  type ReservationItem,
} from '../api/reservations'
import { fetchAccessMe, fetchAccessModules, computeModuleAmount, claimFreeAccess, type AccessMe, type AccessModule, type CheckoutCartItem } from '../api/accessRequests'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CancelReservationModal } from '../components/CancelReservationModal'
import { EmptyState } from '../components/EmptyState'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { Reveal } from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import { AppShell, userInitialsOf, type AppTab } from '../components/layout/AppShell'
import { Badge, Button, Card, IconBadge, ProgressBar, SectionTitle, StatCard } from '../components/ui'
import '../styles/auth.css'
import '../styles/learner.css'
import '../styles/reservation.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ConduitePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [progress, setProgress] = useState<DrivingProgress | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [pickHours, setPickHours] = useState(false)
  const [hoursQty, setHoursQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchDrivingDashboard()
      setProgress(data.progress)
      setUpcoming(data.upcoming || [])
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void Promise.all([fetchAccessMe(), fetchAccessModules()])
      .then(([me, catalog]) => {
        setAccessMe(me)
        setModules(catalog)
      })
      .catch(() => {
        setAccessMe(null)
        setModules([])
      })
      .finally(() => setAccessLoading(false))
  }, [user])

  const conduiteUnlocked = Boolean(
    accessMe &&
      (accessMe.access?.conduite_videos ||
        accessMe.access?.conduite_heures ||
        (accessMe.user?.soldeHeures || 0) > 0),
  )

  useEffect(() => {
    if (conduiteUnlocked) void load()
  }, [conduiteUnlocked, load])

  const hoursModule = modules.find((m) => m.key === 'conduite_heures')
  const hoursPrice = hoursModule
    ? computeModuleAmount('conduite_heures', hoursModule.price, hoursQty)
    : hoursQty >= 2
      ? hoursQty * 5000 - 1000
      : hoursQty * 5000

  // Les cours vidéo sont gratuits : seul le pack d’heures moniteur passe au paiement.
  const cartItems: CheckoutCartItem[] = pickHours
    ? [{ module: 'conduite_heures', quantity: hoursQty }]
    : []
  const cartTotal = pickHours ? hoursPrice : 0

  const activateFreeVideos = async () => {
    setClaimingFree(true)
    setError(null)
    try {
      const result = await claimFreeAccess(['conduite_videos'])
      setAccessMe(result.access)
      navigate('/conduite/lecons')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible')
    } finally {
      setClaimingFree(false)
    }
  }

  const openCancel = (item: ReservationItem) => {
    setError(null)
    setCancelReason('')
    setCancelTarget(item)
  }

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
          title="Conduite"
          icon={<DriveModuleIcon size={28} />}
          tone="drive"
          onBack={() => navigate('/accueil')}
        />

        {accessLoading ? (
          <Card className="learner-empty">
            <p>Vérification de votre accès…</p>
          </Card>
        ) : !conduiteUnlocked ? (
          <Card className="subscription-locked-state">
            <IconBadge icon={<BookOpen size={32} />} tone="orange" />
            <SectionTitle>Choisir tes accès conduite</SectionTitle>
            <p>
              Les cours vidéo sont gratuits. Les heures avec moniteur restent payantes.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="offer-pick-list">
              {!accessMe?.access?.conduite_videos ? (
                <Button
                  variant="outline"
                  disabled={claimingFree}
                  onClick={() => void activateFreeVideos()}
                >
                  Cours vidéo de conduite
                  {claimingFree ? ' · Activation…' : ''}
                </Button>
              ) : null}
              <Button
                variant="outline"
                tone="orange"
                className={pickHours ? ' is-selected' : ''}
                onClick={() => setPickHours((v) => !v)}
              >
                Heure avec moniteur · {formatPrice(hoursModule?.price || 5000)} / heure
                {hoursQty >= 2 ? ` · total ${formatPrice(hoursPrice)} (−1 000)` : ''}
              </Button>
            </div>
            {pickHours ? (
              <label className="access-quantity-field">
                Nombre d’heures
                <input
                  type="number"
                  min={1}
                  value={hoursQty}
                  onChange={(event) => setHoursQty(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            ) : null}
            {pickHours ? (
              <Button
                variant="cta"
                tone="orange"
                icon={<CalendarPlus size={18} />}
                disabled={claimingFree}
                onClick={() => setCheckoutOpen(true)}
              >
                Payer {formatPrice(cartTotal)}
              </Button>
            ) : null}
            <MobileMoneyCheckout
              open={checkoutOpen}
              items={cartItems}
              modules={modules}
              defaultPhone={user.phone}
              onClose={() => setCheckoutOpen(false)}
              onSuccess={(access) => {
                setAccessMe(access)
                setCheckoutOpen(false)
              }}
            />
          </Card>
        ) : (
          <>
        <Reveal delay={80}>
        <header className="auth-header learner-header learner-anim-header">
          <div className="learner-courses-accents" aria-hidden="true">
            <span className="learner-accent learner-accent-green" />
            <span className="learner-accent learner-accent-gold" />
            <span className="learner-accent learner-accent-navy" />
          </div>
          <p>Tableau de bord, réservations et leçons pratiques.</p>
        </header>
        </Reveal>

        <Reveal delay={140}>
        <Card className="conduite-card">
          {error ? <p className="form-error">{error}</p> : null}

          <div className="conduite-top-row learner-anim-item" style={{ animationDelay: '0.12s' }}>
            {progress ? (
              <Card className="progress-card">
                <SectionTitle>Progression conduite</SectionTitle>
                <StatCard
                  icon={<CalendarPlus size={14} />}
                  label="Heures effectuées"
                  value={`${progress.heuresEffectuees} / ${progress.heuresObjectif} h`}
                />
                <ProgressBar percent={progress.percent} />
                <StatCard
                  icon={<BookOpen size={14} />}
                  label="Solde heures moniteur"
                  value={`${progress.soldeHeures} h`}
                />
              </Card>
            ) : null}

            <div className="upcoming-block">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <SectionTitle>Mes réservations</SectionTitle>
                <Button variant="outline" icon={<ChevronRight size={14} />} onClick={() => navigate('/conduite/mes-reservations')}>
                  Voir tout
                </Button>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  title="Aucune séance"
                  message="Aucune séance réservée pour le moment."
                  action={
                    <Button
                      variant="cta"
                      tone="orange"
                      icon={<CalendarPlus size={16} />}
                      onClick={() => navigate('/conduite/reservation')}
                    >
                      Réserver
                    </Button>
                  }
                />
              ) : (
                <ul className="upcoming-list">
                  {upcoming.map((item) => {
                    const confirmed = item.paymentStatus === 'paid' || item.status === 'confirmed'
                    return (
                    <li key={String(item.id)}>
                      <Card>
                      <div className="upcoming-item-main">
                        <strong>
                          {item.creneau
                            ? `${item.creneau.date} · ${item.creneau.startTime}`
                            : 'Séance'}
                        </strong>
                        <span>
                          {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                          <Badge tone={confirmed ? 'green' : 'orange'}>{statusLabel(item)}</Badge>
                        </span>
                      </div>
                      {item.canCancel ? (
                        <Button
                          variant="outline"
                          onClick={() => openCancel(item)}
                        >
                          Annuler
                        </Button>
                      ) : null}
                      </Card>
                    </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="conduite-actions-row learner-anim-item" style={{ animationDelay: '0.18s' }}>
            <Card className="conduite-action-reserve">
              <IconBadge icon={<CalendarPlus size={22} />} tone="orange" />
              <span className="conduite-action-copy">
                <strong>Réserver</strong>
                <small>Choisir un créneau avec un moniteur</small>
              </span>
              <Button
                variant="cta"
                tone="orange"
                icon={<CalendarPlus size={16} />}
                onClick={() => navigate('/conduite/reservation')}
              >
                Réserver
              </Button>
            </Card>
            <Card className="conduite-action-lessons">
              <IconBadge icon={<BookOpen size={22} />} tone="green" />
              <span className="conduite-action-copy">
                <strong>Leçons</strong>
                <small>Manœuvres, circulation et examen</small>
              </span>
              <Button
                variant="outline"
                icon={<BookOpen size={16} />}
                onClick={() => navigate('/conduite/lecons')}
              >
                Voir les leçons
              </Button>
            </Card>
          </div>

          <div className="conduite-copy learner-anim-item" style={{ animationDelay: '0.22s' }}>
            <SectionTitle>Votre parcours de conduite</SectionTitle>
            <p>
              Bienvenue dans l’espace conduite de Monpermis. Ici, vous suivez vos heures
              pratiques, réservez vos séances avec un moniteur et consultez les leçons pour
              progresser étape par étape jusqu’à l’examen.
            </p>
            <p>
              Vous pouvez annuler une séance jusqu’à 24 h avant, en indiquant une
              justification. L’administration est informée du motif.
            </p>
          </div>
        </Card>
        </Reveal>
          </>
        )}
      </div>

      {conduiteUnlocked && cancelTarget ? (
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
