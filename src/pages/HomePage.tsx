import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Flag, CalendarClock, TrendingUp } from 'lucide-react';
import { supportWhatsAppUrl } from '../utils/support';
import { clearSession } from '../api/auth';
import { tracker } from '../utils/tracker';
import { fetchUnreadCount } from '../api/notifications';
import { fetchAccessMe, type AccessMe } from '../api/accessRequests';
import { fetchLearnerJourney, fetchPracticeExamScores, type LearnerJourney, type PracticeExamScore } from '../api/content';
import { fetchDrivingDashboard, type ReservationItem } from '../api/reservations';
import { AccountSheet } from '../components/AccountSheet';
import { PageSkeleton } from '../components/PageSkeleton';
import { useAuth } from '../hooks/useAuth';
;
import { useFocusRefresh } from '../hooks/useFocusRefresh';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { GlassAction } from '../components/ui/GlassAction';
import { NotchedCard } from '../components/ui/NotchedCard';
import { ScoreBars } from '../components/ui/ScoreBars';
import { HeroCard } from '../components/ui/HeroCard';
import { AppShell, userInitialsOf } from '../components/layout/AppShell';

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatReservationDate(iso: string) {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null);
  const [, setAccessReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [journey, setJourney] = useState<LearnerJourney | null>(null);
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([]);
  const [examScores, setExamScores] = useState<PracticeExamScore[]>([]);

  const loadUnread = () => {
    void fetchUnreadCount()
      .then(({ unreadCount: count }) => setUnreadCount(count))
      .catch(() => setUnreadCount(0));
  };

  const loadInsights = () => {
    void fetchLearnerJourney().then(setJourney).catch(() => setJourney(null));
    void fetchDrivingDashboard()
      .then((data) => setUpcoming(data.upcoming ?? []))
      .catch(() => setUpcoming([]));
    void fetchPracticeExamScores()
      .then((data) => setExamScores(data.scores ?? []))
      .catch(() => setExamScores([]));
  };

  useEffect(() => {
    if (!user) return;
    setAccessReady(false);
    void fetchAccessMe()
      .then(setAccessMe)
      .catch(() => setAccessMe(null))
      .finally(() => setAccessReady(true));
    loadUnread();
    loadInsights();
  }, [user]);

  useFocusRefresh(Boolean(user), () => {
    void fetchAccessMe().then(setAccessMe).catch(() => setAccessMe(null));
    loadUnread();
    loadInsights();
  });

  const handleLogout = () => {
    clearSession();
    tracker.reset();
    navigate('/intro', { replace: true });
  };

  if (loading || !user) {
    return (
      <div className="mp-shell">
        <main className="mp-content">
          <PageSkeleton variant="home" />
        </main>
      </div>
    );
  }

  const greeting = greetingWord();
  const displayName = user.firstName?.trim() || 'apprenant';

  // Données réelles
  const code = journey?.code;
  const codeDone = code?.chaptersDone ?? 0;
  const codeTotal = code?.chaptersTotal ?? 0;
  const codeRatio = codeTotal > 0 ? codeDone / codeTotal : 0;
  const lastExam = examScores[examScores.length - 1];
  const previousExam = examScores[examScores.length - 2];
  const trendDelta = lastExam && previousExam ? lastExam.correct - previousExam.correct : null;
  const nextLesson = upcoming[0];
  const soldeHeures = accessMe?.user.soldeHeures ?? 0;

  // Scores pour ScoreBars
  const recentScores = examScores.slice(-6);
  const scoreBarsData = Array.from({ length: 6 }, (_, index) => {
    const score = recentScores[index - (6 - recentScores.length)];
    return {
      label: `S${index + 1}`,
      value: score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0,
      color: (index < 3 ? 'old' : index < 5 ? 'recent' : 'latest') as 'old' | 'recent' | 'latest',
    };
  });

  return (
    <AppShell
      activeTab="accueil"
      userInitials={userInitialsOf(user.firstName, user.lastName)}
      hasUnread={unreadCount > 0}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => setProfileOpen(true)}
    >
      <div className="home-dashboard">
        <div className="home-dashboard-content">
          <div className="home-dashboard-greeting">
            <span>{greeting},</span>
            <h1>{displayName}</h1>
          </div>

        {/* HeroCard - Ta préparation au code */}
        <HeroCard>
          <svg width="170" height="200" viewBox="0 0 170 200" fill="none" style={{ position: 'absolute', right: -30, top: -18, opacity: 0.16, pointerEvents: 'none' }}>
            <path d="M20 200 L150 0H174L70 200Z" fill="#FFFFFF" />
            <path d="M130 46L121 60M110 78L101 92M90 110L81 124M70 142L61 156" stroke="#FFB400" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>Ta préparation au code</div>
          <div style={{ display: 'flex', alignItems: 'flexEnd', gap: 10 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 58, lineHeight: 0.95, fontWeight: 700, letterSpacing: '-0.04em' }}>
              {codeTotal > 0 ? Math.round(codeRatio * 100) : 0}<span style={{ color: 'rgba(255,255,255,0.45)' }}>%</span>
            </div>
            <div style={{ paddingBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              {lastExam ? `Dernier examen blanc · ${lastExam.correct}/${lastExam.total}` : 'prête pour l\'examen'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {trendDelta != null && trendDelta !== 0 ? (
              <Chip variant="glass" size="sm">
                <TrendingUp size={14} strokeWidth={2.4} stroke="#3BE08A" />
                {trendDelta > 0 ? `+${trendDelta}` : trendDelta} pts
              </Chip>
            ) : null}
            <Chip variant="glass" size="sm">
              {codeTotal > 0 ? `${codeDone}/${codeTotal} chapitres` : 'Commence ton premier chapitre'}
            </Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 4 }}>
            <GlassAction
              icon={<BookOpen size={22} strokeWidth={1.9} />}
              label="Réviser"
              onPress={() => navigate('/code-de-la-route/revision-chapitres')}
            />
            <GlassAction
              icon={<Flag size={22} strokeWidth={1.9} />}
              label="Examen blanc"
              onPress={() => navigate('/code-de-la-route/examens-test')}
            />
            <GlassAction
              icon={<CalendarClock size={22} strokeWidth={2} />}
              label="Réserver"
              accent
              onPress={() => navigate('/conduite/reservation')}
            />
          </div>
        </HeroCard>

        {/* Section Prochaine leçon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>Prochaine leçon</h2>
          <a href="/conduite/mes-reservations" style={{ fontSize: 13, fontWeight: 700, textDecoration: 'underline', color: '#067A37' }}>Tout voir</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: -8 }}>
          <NotchedCard
            tabLabel="Conduite"
            tabColor="#0A1B3D"
            tabIcon={<span style={{ width: 8, height: 8, borderRadius: 4, background: '#0BAA4F' }} />}
            time={nextLesson?.creneau?.startTime ?? (nextLesson ? 'À confirmer' : '—')}
            date={nextLesson?.creneau ? formatReservationDate(nextLesson.creneau.date) : '—'}
          >
            {nextLesson ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15 }}>
                    {initialsOf(nextLesson.moniteur?.fullName || 'Moniteur')}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
                      {nextLesson.creneau ? `${formatReservationDate(nextLesson.creneau.date)} · ${nextLesson.creneau.startTime}` : 'Séance programmée'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                      avec {nextLesson.moniteur?.fullName || 'ton moniteur'} · 2 h
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Chip variant="green" size="sm">
                    {nextLesson.paymentStatus === 'paid' || nextLesson.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                  </Chip>
                  <Chip variant="glass" size="sm">
                    Solde : {soldeHeures} h restantes
                  </Chip>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15 }}>MP</div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Réserve ta prochaine leçon</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Choisis ton moniteur et ton créneau</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Chip variant="green" size="sm">Solde : {soldeHeures} h restantes</Chip>
                  <Button variant="accent" size="sm" onClick={() => navigate('/conduite/reservation')}>Voir les moniteurs</Button>
                </div>
              </>
            )}
          </NotchedCard>
        </div>

        {/* ScoreBars : la carte et son en-tête sont fournis par le composant. */}
        <ScoreBars scores={scoreBarsData} />

      </div>
      </div>

      <AccountSheet
        visible={profileOpen}
        user={user}
        greeting={greeting}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
        onOpenAbonnement={() => { setProfileOpen(false); navigate('/abonnement'); }}
        onOpenPayments={() => { setProfileOpen(false); navigate('/abonnement/historique'); }}
        onOpenSupport={() => { setProfileOpen(false); window.open(supportWhatsAppUrl('Bonjour Monpermis, j\'ai besoin d\'aide.'), '_blank', 'noopener,noreferrer'); }}
        onOpenProfile={() => { setProfileOpen(false); navigate('/profil'); }}
      />
    </AppShell>
  );
}

export default HomePage;