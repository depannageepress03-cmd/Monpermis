import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createReservation, fetchAvailableCreneaux, fetchDrivingDashboard, fetchMoniteurAvailability, fetchPublicMoniteurs, requestReservationSlot, ReservationError, type AvailabilityDay, type DrivingProgress, type MoniteurPublic, type ReservationSlot } from '../../api/reservations';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../hooks/useAuth';
import { Button, DayPill, HeroCard, LogoTile, MonitorChip, SlotButton } from '../../components/ui';
import { MainTabBar } from '../../components/MainTabBar';

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

function slotHours(slot: ReservationSlot): number {
  const [sh, sm] = slot.startTime.split(':').map((v) => parseInt(v, 10) || 0);
  const [eh, em] = slot.endTime.split(':').map((v) => parseInt(v, 10) || 0);
  return Math.max(0.5, Math.round((eh - sh + (em - sm) / 60) * 2) / 2);
}

export function ReservationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<DrivingProgress | null>(null);
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [creneaux, setCreneaux] = useState<{ date: string; creneaux: ReservationSlot[] }[] | null>(null);
  const [selectedMoniteurId, setSelectedMoniteurId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const data = await fetchDrivingDashboard();
      setProgress(data.progress);
    } catch {
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadProgress();
    void fetchPublicMoniteurs()
      .then((data) => {
        setMoniteurs(data.moniteurs);
        const fromQuery = searchParams.get('moniteurId') || '';
        const initial = data.moniteurs.some((m) => m.id === fromQuery)
          ? fromQuery
          : data.moniteurs[0]?.id || '';
        setSelectedMoniteurId(initial);
      })
      .catch(() => setMoniteurs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!selectedMoniteurId) return;
    setSelectedSlotId('');
    void fetchMoniteurAvailability({ moniteurId: selectedMoniteurId, days: 14 })
      .then((data) => {
        const days = (data.days ?? []).filter((day) => day.windows.length > 0);
        setAvailabilityDays(days);
        const wanted = searchParams.get('date') || '';
        setSelectedDate(days.some((d) => d.date === wanted) ? wanted : days[0]?.date || '');
      })
      .catch(() => {
        setAvailabilityDays([]);
        setSelectedDate('');
      });
    void fetchAvailableCreneaux({ moniteurId: selectedMoniteurId })
      .then(setCreneaux)
      .catch(() => setCreneaux(null));
  }, [selectedMoniteurId, searchParams]);

  const weekDays = useMemo(() => availabilityDays.slice(0, 6), [availabilityDays]);

  const daySlots = useMemo(() => {
    const entry = creneaux?.find((day) => day.date === selectedDate);
    return [...(entry?.creneaux ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [creneaux, selectedDate]);

  // Présélection du créneau via query (?date=…&start=…) ou premier libre.
  useEffect(() => {
    const wantedStart = searchParams.get('start') || '';
    const match = wantedStart
      ? daySlots.find((slot) => slot.startTime === wantedStart && slot.available)
      : daySlots.find((slot) => slot.available);
    setSelectedSlotId(match?.id ?? '');
  }, [daySlots, searchParams]);

  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedMoniteur = moniteurs.find((m) => m.id === selectedMoniteurId) ?? null;
  const selectedDayDate = parseDay(selectedDate);
  const monthLabel = useMemo(() => {
    const dates = weekDays.map((day) => parseDay(day.date)).filter((d): d is Date => d !== null);
    if (dates.length === 0) return '';
    const first = FR_MONTHS[dates[0].getMonth()];
    const last = FR_MONTHS[dates[dates.length - 1].getMonth()];
    return first === last ? first : `${first} – ${last}`;
  }, [weekDays]);

  const soldeHeures = progress?.soldeHeures ?? 0;
  const slotPrice = selectedSlot?.priceFcfa ?? 0;
  const slotLabel = selectedSlot && selectedDayDate
    ? `${FR_DAYS[selectedDayDate.getDay()]} ${selectedDayDate.getDate()} · ${selectedSlot.startTime} – ${selectedSlot.endTime}`
    : null;

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedMoniteurId || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const held = await requestReservationSlot({
        moniteurId: selectedMoniteurId,
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        vehicleType: selectedSlot.vehicleType || 'voiture',
      });
      if (!held.creneau) {
        throw new ReservationError('Ce créneau vient d’être pris. Choisis un autre horaire.');
      }
      const hours = slotHours(selectedSlot);
      if ((progress?.soldeHeures ?? 0) < hours) {
        setError(`Solde insuffisant (${hours} h requise${hours > 1 ? 's' : ''}). Recharge tes heures sur Offres pour confirmer.`);
        return;
      }
      await createReservation({
        creneauIds: [String(held.creneau.id)],
        vehicleType: held.creneau.vehicleType || selectedSlot.vehicleType || 'voiture',
        moniteurId: selectedMoniteurId,
        paymentMethod: 'solde',
      });
      navigate('/conduite/mes-reservations', { replace: true });
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Confirmation impossible');
    } finally {
      setConfirming(false);
    }
  };

  if (loading || !user) return <PageLoader />;

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div className="mp-page-stage" style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => navigate('/conduite')} aria-label="Retour" style={{ width: 44, height: 44, borderRadius: 22, border: '1.5px solid #E1E6EF', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={22} color="#0A1B3D" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center' }}>Réserver une séance</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3, textAlign: 'center' }}>Moniteur, jour puis créneau libre</div>
          </div>
          <LogoTile size="sm" />
        </div>

        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#C2410C' }}>{error}</p>
        ) : null}

        {/* Récap solde */}
        <HeroCard variant="conduite">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Solde d'heures</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700 }}>{soldeHeures} h</div>
          </div>
        </HeroCard>

        {/* Moniteur */}
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }}>Moniteur</div>
        {moniteurs.length === 0 ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
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
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }}>{monthLabel || 'Jours'}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>
            {selectedDayDate ? `Semaine ${isoWeek(selectedDayDate)}` : ''}
          </div>
        </div>
        {weekDays.length === 0 ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
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
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
            Plus de créneau disponible ce jour. Choisis un autre jour.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {daySlots.map((slot) => (
              <SlotButton
                key={slot.id}
                time={`${slot.startTime} – ${slot.endTime}`}
                state={!slot.available ? 'unavailable' : selectedSlotId === slot.id ? 'selected' : 'available'}
                onSelect={() => setSelectedSlotId(slot.id)}
              />
            ))}
          </div>
        )}

        {/* Récapitulatif */}
        {selectedSlot ? (
          <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 600, color: '#0A1B3D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#5B6680' }}>Moniteur</span>
              <span>{selectedMoniteur?.fullName || 'Moniteur'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#5B6680' }}>Séance</span>
              <span>{slotLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#5B6680' }}>Durée</span>
              <span>{slotHours(selectedSlot)} h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
              <span>Total</span>
              <span>{slotPrice.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        ) : null}

        {/* CTA */}
        {soldeHeures <= 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button variant="slider" size="md" fullWidth disabled rightIcon={ChevronRight} iconSize={20}>
              <span>Solde épuisé</span>
            </Button>
            <Link to="/abonnement" style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#067A37', textDecoration: 'none' }}>
              Recharger mes heures sur Offres
            </Link>
          </div>
        ) : (
          <Button variant="slider" size="md" fullWidth disabled={!selectedSlot || confirming} rightIcon={ChevronRight} iconSize={20} onClick={() => void handleConfirm()}>
            <span>{confirming ? 'Confirmation…' : selectedSlot ? `Confirmer · ${slotLabel} · ${slotPrice.toLocaleString('fr-FR')} FCFA` : 'Choisis un créneau'}</span>
          </Button>
        )}

      </div>

      <MainTabBar activeId="conduite" />
    </div>
  );
}

export default ReservationPage;
