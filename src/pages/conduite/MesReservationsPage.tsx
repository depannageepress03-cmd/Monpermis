import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cancelReservation, fetchMyReservations, ReservationError, type ReservationItem } from '../../api/reservations';
import { CancelReservationModal } from '../../components/CancelReservationModal';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/PageLoader';
;
import { useAuth } from '../../hooks/useAuth';
import { Badge, Button, Card, StatCard } from '../../components/ui';
import { MainTabBar } from '../../components/MainTabBar';
import { LogoMark } from '../../components/icons/LogoMark';


function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return date;
  }
}

function formatTime(time: string) {
  try {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return time;
  }
}

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée';
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider';
  if (item.status === 'pending_payment') return 'En attente';
  return item.status;
}

function statusVariant(status: string) {
  if (status === 'Confirmée') return 'green';
  if (status === 'En attente' || status === 'Paiement à valider' || status === 'Paiement en cours') return 'yellow';
  return 'default';
}

export function MesReservationsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchMyReservations();
      setItems(data.reservations);
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const submitCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      setError('Indiquez une justification d\'au moins 5 caractères');
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      await cancelReservation(String(cancelTarget.id), reason);
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Annulation impossible');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !user) return <PageLoader />;

  const confirmed = items.filter((item) => item.status === 'confirmed');
  const awaitingMoniteur = items.filter((item) => item.status === 'pending_moniteur');
  const pending = items.filter(
    (item) => item.status === 'pending_payment' && item.paymentStatus !== 'paid',
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Mes réservations</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Séances confirmées et paiements en cours. Annulation possible jusqu'à 24 h avant.</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatCard icon={<CalendarCheck size={14} />} label="Confirmées" value={String(confirmed.length)} />
          <StatCard icon={<CalendarCheck size={14} />} label="En attente moniteur" value={String(awaitingMoniteur.length)} />
          <StatCard icon={<CalendarCheck size={14} />} label="En attente paiement" value={String(pending.length)} />
        </div>

        {/* Reservations */}
        <div style={{ borderRadius: 26, background: '#FFFFFF', padding: 18, boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{error}</p>}
          {busy && <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Chargement…</p>}

          {!busy && items.length === 0 ? (
            <EmptyState
              title="Aucune réservation"
              message="Vos séances confirmées apparaîtront ici après réservation."
              action={
                <Button variant="accent" icon={<CalendarCheck size={16} />} onClick={() => navigate('/conduite/reservation')}>
                  Réserver une séance
                </Button>
              }
            />
          ) : (
            <>
              {!busy && confirmed.length > 0 ? (
                <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>Confirmées</h2>
                  <ul className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {confirmed.map((item) => (
                      <li key={String(item.id)}>
                        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <strong style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>
                              {item.creneau
                                ? `${formatDateLabel(item.creneau.date)} · ${formatTime(item.creneau.startTime)} – ${formatTime(item.creneau.endTime)}`
                                : 'Séance'}
                            </strong>
                            <span style={{ fontSize: 12.5, color: '#5B6680' }}>
                              {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                              <Badge variant={statusVariant(statusLabel(item))} size="sm">{statusLabel(item)}</Badge>
                            </span>
                          </div>
                          {item.canCancel ? (
                            <Button variant="outline" size="sm" onClick={() => {
                              setError(null);
                              setCancelReason('');
                              setCancelTarget(item);
                            }}>
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
                <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: '1.25rem' }}>
                  <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>En attente du moniteur</h2>
                  <ul className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {awaitingMoniteur.map((item) => (
                      <li key={String(item.id)}>
                        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <strong style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>
                              {item.creneau
                                ? `${formatDateLabel(item.creneau.date)} · ${formatTime(item.creneau.startTime)} – ${formatTime(item.creneau.endTime)}`
                                : 'Séance'}
                            </strong>
                            <span style={{ fontSize: 12.5, color: '#5B6680' }}>
                              {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                              <Badge variant={statusVariant(statusLabel(item))} size="sm">{statusLabel(item)}</Badge>
                            </span>
                          </div>
                          {item.canCancel ? (
                            <Button variant="outline" size="sm" onClick={() => {
                              setError(null);
                              setCancelReason('');
                              setCancelTarget(item);
                            }}>
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
                <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: '1.25rem' }}>
                  <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>En attente de paiement</h2>
                  <ul className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pending.map((item) => (
                      <li key={String(item.id)}>
                        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <strong style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>
                              {item.creneau
                                ? `${formatDateLabel(item.creneau.date)} · ${formatTime(item.creneau.startTime)}`
                                : 'Séance'}
                            </strong>
                            <span style={{ fontSize: 12.5, color: '#5B6680' }}>
                              {item.moniteur?.fullName || 'Moniteur'} ·{' '}
                              <Badge variant={statusVariant(statusLabel(item))} size="sm">{statusLabel(item)}</Badge>
                            </span>
                          </div>
                          {item.canCancel ? (
                            <Button variant="outline" size="sm" onClick={() => {
                              setError(null);
                              setCancelReason('');
                              setCancelTarget(item);
                            }}>
                              Annuler
                            </Button>
                          ) : null}
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <Button variant="accent" fullWidth icon={<CalendarCheck size={16} />} onClick={() => navigate('/conduite/reservation')} style={{ marginTop: '1.25rem' }}>
                Nouvelle réservation
              </Button>
            </>
          )}

        </div>

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="conduite" />

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
  );
}

export default MesReservationsPage;