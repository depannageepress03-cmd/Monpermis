import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  FileText,
} from 'lucide-react';
import {
  fetchDashboardSummary,
  subscribeToDashboardPaymentEvents,
  type DashboardSummary,
} from '../api/dashboard';
import { fetchAdminReservations } from '../api/reservations';
import type { ReservationAdmin } from '../types/reservations';
import { getAdminToken, useAdminAuth } from '../context/AdminAuthContext';
import { Skeleton } from '../ui';
import { LogoMark } from '../components/icons/LogoMark';

const emptySummary: DashboardSummary = {
  users: { total: 0, active: 0, suspended: 0 },
  code: { chapters: 0, published: 0, courses: 0, questions: 0 },
  conduite: {
    chapters: 0,
    published: 0,
    courses: 0,
    moniteurs: 0,
    moniteursActive: 0,
    creneauxLibre: 0,
    reservations: 0,
    reservationsPending: 0,
    reservationsConfirmed: 0,
  },
  admins: { total: 0 },
  revenue: { currency: 'XOF', total: 0, month: 0, transactions: 0 },
  accessRequests: { active: 0, pending: 0, expired: 0 },
  payments: { pending: 0, needsRefund: 0, recent: [] },
};

function formatXof(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} XOF`;
}

function adminInitials(fullName?: string | null) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function learnerInitials(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function learnerName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  return name || 'Apprenant';
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart || '').split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' });
  const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  return `${weekday} ${d} ${month}`;
}

function reservationStatus(reservation: ReservationAdmin): { label: string; confirmed: boolean } {
  if (reservation.status === 'confirmed' || reservation.paymentStatus === 'paid') {
    return { label: 'Confirmée', confirmed: true };
  }
  return { label: 'En attente', confirmed: false };
}

const MODULE_LABELS: Record<string, string> = {
  code: 'Code',
  conduite_heures: 'Conduite',
  conduite_videos: 'Vidéos',
  aiChat: 'Chat IA',
};

export function DashboardPage() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [reservations, setReservations] = useState<ReservationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<number | null>(null);

  const applySummary = useCallback((next: DashboardSummary) => {
    setSummary(next);
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAdminToken();
      if (!token) return;
      if (!silent) {
        setLoading(true);
      }
      try {
        const [dashboard, reservationsData] = await Promise.all([
          fetchDashboardSummary(token),
          fetchAdminReservations(token).catch(() => ({ reservations: [] as ReservationAdmin[] })),
        ]);
        applySummary(dashboard.summary);
        setReservations(reservationsData.reservations);
      } catch (err) {
        if (!silent) {
          console.error('Failed to load dashboard:', err);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applySummary],
  );

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      void load({ silent: true });
    }, 800);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    const unsubscribe = subscribeToDashboardPaymentEvents(
      token,
      (_payment) => {
        scheduleSilentRefresh();
      },
    );

    return () => {
      unsubscribe();
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current);
    };
  }, [scheduleSilentRefresh]);

  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const upcomingReservations = [...reservations]
    .filter((item) => item.status !== 'cancelled')
    .sort((a, b) => String(a.creneau?.date || '').localeCompare(String(b.creneau?.date || '')))
    .slice(0, 4);

  const recentPayments = summary.payments.recent.slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', background: '#EAEFF6', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#0A1B3D', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: 272, flexShrink: 0, boxSizing: 'border-box', padding: '28px 18px', background: 'radial-gradient(120% 50% at 0% 100%, rgba(11,170,79,0.28) 0%, rgba(11,170,79,0) 60%), linear-gradient(180deg, #0F2554 0%, #0A1B3D 50%, #06122A 100%)', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 26, minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 15, background: '#FFFFFF', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={66} height={66} alt="Monpermis.bj" />
          </div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800 }}>Monpermis<span style={{ color: '#3BE08A' }}>.bj</span></div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Administration</div>
          </div>
        </div>

        <nav aria-label="Administration" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link to="/" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'rgba(255,255,255,0.12)', color: '#FFFFFF' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#FFB400' }} />
            Tableau de bord
          </Link>

          <div style={{ padding: '14px 14px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Contenu</div>

          <Link to="/code/revision-chapitres" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            Chapitres & cours
          </Link>

          <Link to="/code/examens-test" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            QCM & examens
          </Link>

          <div style={{ padding: '14px 14px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Conduite</div>

          <Link to="/conduite/lecons" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            Moniteurs & véhicules
          </Link>

          <Link to="/conduite/reservations" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            Créneaux & réservations
          </Link>

          <div style={{ padding: '14px 14px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Apprenants</div>

          <Link to="/utilisateurs" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            Apprenants & heures
          </Link>

          <Link to="/abonnements" style={{ height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 23, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,0.74)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />
            Formules & abonnements
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', borderRadius: 22, padding: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 14 }}>{adminInitials(admin?.fullName)}</div>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.fullName || 'Administrateur'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.phone || ''}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, boxSizing: 'border-box', padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 22, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flexGrow: 1 }}>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>Tableau de bord</h1>
            <div style={{ fontSize: 13.5, color: '#5B6680', fontWeight: 600, marginTop: 3, textTransform: 'capitalize' }}>{todayLabel}</div>
          </div>
          <label style={{ width: 320, height: 48, boxSizing: 'border-box', padding: '0 18px', borderRadius: 24, background: '#FFFFFF', border: '1.5px solid #E1E6EF', display: 'flex', alignItems: 'center', gap: 10, color: '#5B6680' }}>
            <Search size={18} strokeWidth={2.2} />
            <input type="search" aria-label="Rechercher" placeholder="Rechercher un apprenant, un cours…" style={{ flexGrow: 1, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#0A1B3D' }} />
          </label>
          <button type="button" aria-label="Notifications" style={{ width: 48, height: 48, border: '1.5px solid #E1E6EF', borderRadius: 24, background: '#FFFFFF', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={20} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => navigate('/code/cours')} style={{ height: 48, padding: '0 22px', border: 0, borderRadius: 24, background: '#FFB400', color: '#0A1B3D', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 12px 24px -12px rgba(255,180,0,0.7)' }}>
            <Plus size={16} strokeWidth={2.6} />
            Nouveau cours
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, padding: 20, background: 'radial-gradient(100% 90% at 100% 0%, rgba(11,170,79,0.42) 0%, rgba(11,170,79,0) 60%), linear-gradient(160deg, #16306A 0%, #0A1B3D 60%, #06122A 100%)', color: '#FFFFFF', boxShadow: '0 24px 40px -24px rgba(10,27,61,0.8)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Apprenants actifs</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>{loading ? <Skeleton height={36} width={80} /> : summary.users.active}</div>
            <div style={{ height: 28, alignSelf: 'flex-start', padding: '0 11px', borderRadius: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700 }}>{summary.users.total} inscrits</div>
          </div>

          <div style={{ borderRadius: 26, padding: 20, background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B6680' }}>Abonnements actifs</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>{loading ? <Skeleton height={36} width={80} /> : summary.accessRequests.active}</div>
            <div style={{ height: 28, alignSelf: 'flex-start', padding: '0 11px', borderRadius: 14, background: '#EAF7EF', color: '#067A37', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800 }}>{summary.revenue.transactions} paiements</div>
          </div>

          <div style={{ borderRadius: 26, padding: 20, background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B6680' }}>Revenus du mois</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>{loading ? <Skeleton height={36} width={120} /> : formatXof(summary.revenue.month)}</div>
            <div style={{ height: 28, alignSelf: 'flex-start', padding: '0 11px', borderRadius: 14, background: '#FFF4D6', color: '#7A5200', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800 }}>FedaPay · Mobile Money</div>
          </div>

          <div style={{ borderRadius: 26, padding: 20, background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B6680' }}>Réservations</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>{loading ? <Skeleton height={36} width={48} /> : summary.conduite.reservations}</div>
            <div style={{ height: 28, alignSelf: 'flex-start', padding: '0 11px', borderRadius: 14, background: '#E8EDF6', color: '#0A1B3D', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800 }}>{summary.conduite.moniteursActive} moniteurs actifs</div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Revenue Chart */}
          <div style={{ borderRadius: 26, padding: 22, background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700 }}>Revenus par mois</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#0A1B3D' }} />Abonnements</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#0BAA4F' }} />Heures de conduite</span>
              </div>
            </div>
            <div style={{ minHeight: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', borderRadius: 18, background: '#EAEFF6', fontSize: 13.5, fontWeight: 600, color: '#5B6680', textAlign: 'center' }}>
              Détail mensuel indisponible — l'API expose les totaux du jour, de la semaine et du mois (voir Finances).
            </div>
          </div>

          {/* Donut Chart */}
          <div style={{ borderRadius: 26, padding: 22, background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700 }}>Répartition des formules</div>
            <div style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', borderRadius: 18, background: '#EAEFF6', fontSize: 13.5, fontWeight: 600, color: '#5B6680', textAlign: 'center' }}>
              Répartition indisponible — aucune ventilation par formule côté API.
            </div>
            <button type="button" onClick={() => navigate('/abonnements')} style={{ marginTop: 'auto', height: 44, border: '1.5px solid #E1E6EF', borderRadius: 22, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0A1B3D', cursor: 'pointer' }}>Gérer les formules</button>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, flexGrow: 1, minHeight: 0 }}>
          {/* Upcoming Reservations */}
          <div style={{ borderRadius: 26, padding: '20px 22px', background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700 }}>Réservations à venir</div>
              <Link to="/conduite/reservations" style={{ fontSize: 13, fontWeight: 700, color: '#067A37', textDecoration: 'none' }}>Voir le planning</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.1fr 1fr 0.8fr 0.9fr', gap: 12, padding: '8px 12px', borderRadius: 14, background: '#EAEFF6', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5B6680' }}>
              <span>Apprenant</span><span>Moniteur</span><span>Date</span><span>Créneau</span><span>Statut</span>
            </div>
            {loading ? (
              <Skeleton height={120} width="100%" />
            ) : upcomingReservations.length === 0 ? (
              <div style={{ padding: '20px 12px', fontSize: 13.5, fontWeight: 600, color: '#5B6680', textAlign: 'center' }}>
                Aucune réservation à venir.
              </div>
            ) : (
              upcomingReservations.map((item) => {
                const status = reservationStatus(item);
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.1fr 1fr 0.8fr 0.9fr', gap: 12, alignItems: 'center', padding: '6px 12px', fontSize: 13.5, fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 16, background: '#E8EDF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800 }}>{learnerInitials(item.user?.firstName, item.user?.lastName)}</span>
                      {learnerName(item.user?.firstName, item.user?.lastName)}
                    </span>
                    <span>{item.moniteur?.fullName || '—'}</span>
                    <span>{formatShortDate(item.creneau?.date)}</span>
                    <span>{item.creneau?.startTime || '—'}</span>
                    <span style={{ justifySelf: 'start', height: 26, padding: '0 10px', borderRadius: 13, display: 'flex', alignItems: 'center', fontSize: 11.5, fontWeight: 800, background: status.confirmed ? '#EAF7EF' : '#FFF4D6', color: status.confirmed ? '#067A37' : '#7A5200' }}>{status.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Payments */}
          <div style={{ borderRadius: 26, padding: '20px 22px', background: '#FFFFFF', boxShadow: '0 12px 30px -22px rgba(10,27,61,0.35)', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700 }}>Paiements récents</div>
            {loading ? (
              <Skeleton height={120} width="100%" />
            ) : recentPayments.length === 0 ? (
              <div style={{ padding: '20px 12px', fontSize: 13.5, fontWeight: 600, color: '#5B6680', textAlign: 'center' }}>
                Aucun paiement récent.
              </div>
            ) : (
              recentPayments.map((item) => {
                const modules = item.modules && item.modules.length > 0 ? item.modules : item.module ? [item.module] : [];
                const planLabel = modules.map((key) => MODULE_LABELS[key] ?? key).join(' + ') || 'Abonnement';
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 13, background: '#FFF4D6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1B3D' }}>
                      <FileText size={18} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </span>
                    <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{learnerName(item.learner?.firstName, item.learner?.lastName)} · {planLabel}</span>
                      <span style={{ fontSize: 12, color: '#5B6680', fontWeight: 600 }}>{String(item.paymentMethod || '').toUpperCase()} · {item.activatedAt ? 'activé auto' : 'en cours'}</span>
                    </span>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatXof(item.amount)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;