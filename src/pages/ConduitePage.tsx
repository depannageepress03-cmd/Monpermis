import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { cancelReservation, fetchAvailableCreneaux, fetchDrivingDashboard, fetchMoniteurAvailability, fetchPublicMoniteurs, ReservationError, type AvailabilityDay, type DrivingProgress, type MoniteurPublic, type ReservationItem, type ReservationSlot } from '../api/reservations';
import { fetchAccessMe, type AccessMe } from '../api/accessRequests';
import { CancelReservationModal } from '../components/CancelReservationModal';
import { PageLoader } from '../components/PageLoader';
import { useAuth } from '../hooks/useAuth';
import { Button, LogoTile, HeroCard, DayPill, SlotButton, MonitorChip } from '../components/ui';
import { MainTabBar } from '../components/MainTabBar';

const SEGMENT_COUNT = 20;

const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FR_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function parseDay(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isoWeek(date: Date): number {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ConduitePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<DrivingProgress | null>(null);
  const [, setUpcoming] = useState<ReservationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null);
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [creneaux, setCreneaux] = useState<{ date: string; creneaux: ReservationSlot[] }[] | null>(null);
  const [selectedMoniteurId, setSelectedMoniteurId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const data = await fetchDrivingDashboard();
      setProgress(data.progress);
      setUpcoming(data.upcoming || []);
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchAccessMe()
      .then(setAccessMe)
      .catch(() => setAccessMe(null));
  }, [user]);

  const conduiteUnlocked = Boolean(
    accessMe &&
      (accessMe.access?.conduite_videos ||
        accessMe.access?.conduite_heures ||
        (accessMe.user?.soldeHeures || 0) > 0),
  );

  useEffect(() => {
    if (conduiteUnlocked) void load();
  }, [conduiteUnlocked, load]);

  useEffect(() => {
    if (!user) return;
    void fetchPublicMoniteurs()
      .then((data) => {
        setMoniteurs(data.moniteurs);
        if (data.moniteurs.length > 0 && !selectedMoniteurId) {
          setSelectedMoniteurId(data.moniteurs[0].id);
        }
      })
      .catch(() => setMoniteurs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!selectedMoniteurId) return;
    void fetchMoniteurAvailability({ moniteurId: selectedMoniteurId, days: 14 })
      .then((data) => {
        const days = (data.days ?? []).filter((day) => day.windows.length > 0);
        setAvailabilityDays(days);
        setSelectedDate((current) => current || days[0]?.date || '');
      })
      .catch(() => {
        setAvailabilityDays([]);
        setSelectedDate('');
      });
    void fetchAvailableCreneaux({ moniteurId: selectedMoniteurId })
      .then(setCreneaux)
      .catch(() => setCreneaux(null));
  }, [selectedMoniteurId]);

  const weekDays = useMemo(() => availabilityDays.slice(0, 6), [availabilityDays]);

  const daySlots = useMemo(() => {
    const entry = creneaux?.find((day) => day.date === selectedDate);
    return [...(entry?.creneaux ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [creneaux, selectedDate]);

  useEffect(() => {
    const first = daySlots.find((slot) => slot.available);
    setSelectedSlotId(first?.id ?? '');
  }, [daySlots, selectedDate]);

  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedDayDate = parseDay(selectedDate);
  const monthLabel = useMemo(() => {
    const dates = weekDays.map((day) => parseDay(day.date)).filter((d): d is Date => d !== null);
    if (dates.length === 0) return '';
    const first = FR_MONTHS[dates[0].getMonth()];
    const last = FR_MONTHS[dates[dates.length - 1].getMonth()];
    return first === last ? first : `${first} – ${last}`;
  }, [weekDays]);

  const submitCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères');
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

  const soldeHeures = progress?.soldeHeures ?? accessMe?.user.soldeHeures ?? 0;
  const heuresEffectuees = progress?.heuresEffectuees ?? 0;
  const heuresObjectif = progress?.heuresObjectif ?? 20;
  const doneSegments = Math.round((heuresEffectuees / heuresObjectif) * SEGMENT_COUNT);
  const slotLabel = selectedSlot
    ? `Réserver · ${selectedDayDate ? `${FR_DAYS[selectedDayDate.getDay()]} ${selectedDayDate.getDate()}` : ''} · ${selectedSlot.startTime}`
    : 'Choisis un créneau';

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 390, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Conduite</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Réserve ton prochain créneau</div>
          </div>
          <LogoTile size="sm" />
        </div>

        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#C2410C' }}>{error}</p>
        ) : null}

        {/* HeroCard - Solde d'heures */}
        <HeroCard variant="conduite">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Solde d'heures</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 6 }}>
                {soldeHeures} h<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}> restantes</span>
              </div>
            </div>
            <a href="/abonnement" style={{ height: 38, padding: '0 14px', borderRadius: 19, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', color: '#FFFFFF' }}>
              <Plus size={14} strokeWidth={2.6} />
              Heures
            </a>
          </div>
          <div style={{ display: 'flex', gap: 4 }} role="img" aria-label={`${heuresEffectuees} heures effectuées sur ${heuresObjectif}`}>
            {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
              <div
                key={index}
                style={{
                  flexGrow: 1,
                  height: 8,
                  borderRadius: 4,
                  background: index < doneSegments ? '#0BAA4F' : 'rgba(255,255,255,0.18)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
            <span>{heuresEffectuees} h effectuées</span>
            <span>Forfait {heuresObjectif} h</span>
          </div>
        </HeroCard>

        {/* Moniteur */}
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }}>Moniteur</div>
        {moniteurs.length === 0 ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)', fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
            Aucun moniteur disponible pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: -6, marginRight: -20, overflowX: 'auto', paddingRight: 20 }}>
            {moniteurs.map((moniteur) => (
              <MonitorChip
                key={moniteur.id}
                initials={initialsOf(moniteur.fullName)}
                name={moniteur.fullName}
                selected={selectedMoniteurId === moniteur.id}
                onSelect={() => {
                  setSelectedMoniteurId(moniteur.id);
                  setSelectedDate('');
                  setSelectedSlotId('');
                }}
              />
            ))}
          </div>
        )}

        {/* Jours */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }}>{monthLabel}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>
            {selectedDayDate ? `Semaine ${isoWeek(selectedDayDate)}` : ''}
          </div>
        </div>
        {weekDays.length === 0 ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)', fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
            Aucune disponibilité sur les 14 prochains jours pour ce moniteur.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: -6 }}>
            {weekDays.map((day) => {
              const date = parseDay(day.date);
              if (!date) return null;
              return (
                <DayPill
                  key={day.date}
                  day={FR_DAYS[date.getDay()]}
                  date={date.getDate()}
                  selected={selectedDate === day.date}
                  onSelect={() => {
                    setSelectedDate(day.date);
                    setSelectedSlotId('');
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Créneaux */}
        {selectedDate && daySlots.length === 0 ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)', fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
            Plus de créneau disponible ce jour. Choisis un autre jour.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {daySlots.map((slot) => (
              <SlotButton
                key={slot.id}
                time={slot.startTime}
                state={!slot.available ? 'unavailable' : selectedSlotId === slot.id ? 'selected' : 'available'}
                onSelect={() => setSelectedSlotId(slot.id)}
              />
            ))}
          </div>
        )}

        {/* CTA Slider */}
        {soldeHeures <= 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button variant="slider" size="md" fullWidth disabled rightIcon={ChevronRight} iconSize={20}>
              <span>Solde épuisé</span>
            </Button>
            <a href="/abonnement" style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#067A37', textDecoration: 'none' }}>
              Recharger mes heures sur Offres
            </a>
          </div>
        ) : (
          <Button variant="slider" size="md" fullWidth disabled={!selectedSlot} rightIcon={ChevronRight} iconSize={20} onClick={() => navigate(`/conduite/reservation?moniteurId=${selectedMoniteurId}`)}>
            <span>{slotLabel}</span>
          </Button>
        )}

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="conduite" />

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
  );
}

export default ConduitePage;