import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { earliestBookableTime, fetchMoniteurAvailability, fetchPublicMoniteurs, HOURS_DISCOUNT_FCFA, HOURS_DISCOUNT_MIN_HOURS, ReservationError, type AvailabilityDay, type MoniteurPublic, type ReservationSlot } from '../../api/reservations';
import { fetchAccessMe } from '../../api/accessRequests';
;
import { PageLoader } from '../../components/PageLoader';
;
;
import { useAuth } from '../../hooks/useAuth';
import { Button, DayPill, SlotButton, MonitorChip } from '../../components/ui';
import { MainTabBar } from '../../components/MainTabBar';
import { LogoMark } from '../../components/icons/LogoMark';


type Step = 'moniteur' | 'calendar' | 'payment' | 'success';





const MONITEURS = [
  { id: '1', name: 'M. Houngbo', initials: 'KH' },
  { id: '2', name: 'Mme Dossou', initials: 'AD' },
  { id: '3', name: 'M. Agbo', initials: 'SA' },
];

const DAYS = [
  { day: 'Lun', date: 28, active: false },
  { day: 'Mar', date: 29, active: true },
  { day: 'Mer', date: 30, active: false },
  { day: 'Jeu', date: 1, active: false },
  { day: 'Ven', date: 2, active: false },
  { day: 'Sam', date: 3, active: false },
];

const SLOTS = [
  { time: '07:00', state: 'available' as const },
  { time: '08:00', state: 'selected' as const },
  { time: '10:00', state: 'unavailable' as const },
  { time: '14:00', state: 'available' as const },
  { time: '15:00', state: 'unavailable' as const },
  { time: '16:00', state: 'available' as const },
];

export function ReservationPage() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>('moniteur');
  const [moniteurId, setMoniteurId] = useState<string | undefined>();
  const [, setMoniteurs] = useState<MoniteurPublic[]>([]);
  const [] = useState<string>('');
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [, setHourlyPriceFcfa] = useState(5000);
  const [selectedDate, setSelectedDate] = useState('');
  const [, setStartTime] = useState('');
  const [, setEndTime] = useState('');
  const [] = useState<ReservationSlot | null>(null);
  const [] = useState(0);
  const [] = useState<string | null>(null);
  const [, setHoursDiscount] = useState(HOURS_DISCOUNT_FCFA);
  const [, setHoursDiscountMin] = useState(HOURS_DISCOUNT_MIN_HOURS);
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null);
  const [, setBusy] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [] = useState('');
  const [] = useState('');
  const [] = useState(false);
  const [selectedMoniteur, setSelectedMoniteur] = useState<string>('1');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<string>('08:00');






  const selectedDayObj = useMemo(
    () => availabilityDays.find((day) => day.date === selectedDate) ?? null,
    [availabilityDays, selectedDate],
  );

  const visibleWindows = useMemo(() => {
    const windows = selectedDayObj?.windows ?? [];
    const floor = selectedDate ? earliestBookableTime(selectedDate) : null;
    if (!floor) return windows;
    return windows
      .map((window) => (window.start >= floor ? window : { start: floor, end: window.end }))
      .filter((window) => window.end > window.start);
  }, [selectedDayObj, selectedDate]);





  const loadMoniteurs = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchPublicMoniteurs();
      setMoniteurs(data.moniteurs);
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Moniteurs indisponibles');
    } finally {
      setBusy(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    if (!moniteurId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await fetchMoniteurAvailability({ moniteurId, days: 14 });
      const days = data.days ?? [];
      setAvailabilityDays(days);
      setHourlyPriceFcfa(data.hourlyPriceFcfa || data.moniteur?.defaultPriceFcfa || 5000);
      if (data.hoursDiscountFcfa !== undefined) setHoursDiscount(data.hoursDiscountFcfa);
      if (data.hoursDiscountMinHours !== undefined) setHoursDiscountMin(data.hoursDiscountMinHours);
      const first = days[0];
      if (first) {
        setSelectedDate(first.date);
        setStartTime(first.windows[0]?.start || '');
        setEndTime(first.windows[0]?.end || '');
      } else {
        setSelectedDate('');
        setStartTime('');
        setEndTime('');
      }
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Disponibilités indisponibles');
    } finally {
      setBusy(false);
    }
  }, [moniteurId]);

  useEffect(() => {
    void loadMoniteurs();
  }, [loadMoniteurs]);

  useEffect(() => {
    const fromQuery = searchParams.get('moniteurId');
    if (fromQuery) {
      setMoniteurId(fromQuery);
      setStep('calendar');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null));
  }, []);

  useEffect(() => {
    if (step === 'calendar') void loadAvailability();
  }, [step, loadAvailability]);

  useEffect(() => {
    if (!visibleWindows.length) return;
    const first = visibleWindows[0];
    setStartTime(first.start);
    setEndTime(first.end);
  }, [visibleWindows]);






  if (loading || !user) return <PageLoader />;

  const soldeHeuresVal = soldeHeures ?? 0;
  const heuresEffectuees = 14;
  const heuresObjectif = 20;
  const doneSegments = Math.round((heuresEffectuees / heuresObjectif) * 20);

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Conduite</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Réserve ton prochain créneau</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        {/* HeroCard - Solde d'heures */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: '18px 18px 16px', background: 'radial-gradient(100% 90% at 100% 0%, rgba(255,180,0,0.28) 0%, rgba(255,180,0,0) 55%), linear-gradient(160deg, #1A3A7A 0%, #0A1B3D 60%, #06122A 100%)', color: '#FFFFFF', boxShadow: '0 24px 40px -22px rgba(10,27,61,0.75), inset 0 1px 0 rgba(255,255,255,0.18)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Solde d'heures</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 6 }}>
                {soldeHeuresVal} h<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}> restantes</span>
              </div>
            </div>
            <a href="/abonnement" style={{ height: 38, padding: '0 14px', borderRadius: 19, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', color: '#FFFFFF' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Heures
            </a>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 20 }, (_, index) => (
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
        </div>

        {/* Moniteur */}
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Moniteur</div>
        <div style={{ display: 'flex', gap: 8, marginTop: -6, marginRight: -20, overflowX: 'auto', paddingRight: 20 }}>
          {MONITEURS.map((m) => (
            <MonitorChip
              key={m.id}
              initials={m.initials}
              name={m.name}
              selected={selectedMoniteur === m.id}
              onSelect={() => setSelectedMoniteur(m.id)}
            />
          ))}
        </div>

        {/* Jours */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Septembre – Octobre</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>Semaine 40</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: -6 }}>
          {DAYS.map((d, i) => (
            <DayPill
              key={i}
              day={d.day}
              date={d.date}
              selected={selectedDay === i}
              onSelect={() => setSelectedDay(i)}
            />
          ))}
        </div>

        {/* Créneaux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {SLOTS.map((slot) => (
            <SlotButton
              key={slot.time}
              time={slot.time}
              state={selectedSlot === slot.time ? 'selected' : slot.state}
              onSelect={() => setSelectedSlot(slot.time)}
            />
          ))}
        </div>

        {/* CTA Slider */}
        <Button variant="slider" size="md" fullWidth onClick={() => setStep('payment')}>
          <span>Réserver · Mar 29 · 08:00</span>
          <ChevronRight size={20} strokeWidth={2.4} />
        </Button>

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="conduite" />
    </div>
  );
}

export default ReservationPage;