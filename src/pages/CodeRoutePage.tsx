import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ClipboardList, GraduationCap, Search } from 'lucide-react';
import { computeModuleAmount, fetchAccessMe, fetchAccessModules, type AccessMe, type AccessModule } from '../api/accessRequests';
import { fetchLearnerJourney, fetchRevisionChapters, fetchRevisionProgressFull, type LearnerChapter, type LearnerJourney, type LearnerProgress } from '../api/content';
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout';
import { PageLoader } from '../components/PageLoader';
;
;
import { useAuth } from '../hooks/useAuth';
import { AppShell, TAB_ROUTES } from '../components/layout/AppShell';
import { Button, SectionTitle, LogoTile, GlassAction, HeroCard, TextField } from '../components/ui';
;

export function CodeRoutePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null);
  const [modules, setModules] = useState<AccessModule[]>([]);
  const [journey, setJourney] = useState<LearnerJourney | null>(null);
  const [chapters, setChapters] = useState<LearnerChapter[]>([]);
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      void Promise.all([
        fetchAccessMe(),
        fetchAccessModules(),
        fetchLearnerJourney().catch(() => null),
        fetchRevisionChapters().catch(() => [] as LearnerChapter[]),
        fetchRevisionProgressFull().catch(() => null),
      ])
        .then(([me, catalog, journeyData, chapterData, progressData]) => {
          setAccessMe(me);
          setModules(catalog);
          setJourney(journeyData);
          setChapters(chapterData);
          setProgress(progressData);
        })
        .catch(() => {
          setAccessMe(null);
          setModules([]);
          setJourney(null);
          setChapters([]);
          setProgress(null);
        })
        .finally(() => setAccessLoading(false));
    };
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [user]);

  if (loading || !user) return <PageLoader />;

  const codeModule = modules.find((m) => m.key === 'code');
  const codePrice = codeModule ? computeModuleAmount('code', codeModule.price, 1) : 5000;
  const done = journey?.code.chaptersDone ?? 0;
  const total = journey?.code.chaptersTotal ?? 8;
  const chapterName = journey?.code.currentStop?.chapterName || 'Intersections et priorités';
  // L'API ne renvoie pas la progression interne au chapitre en cours :
  // on affiche la progression chapitres, qui est réelle (pas de donnée inventée).
  const chaptersPercent = total > 0 ? (done / total) * 100 : 0;
  const completedCourseIds = new Set((progress?.completedCourses ?? []).map((entry) => String(entry.courseId)));
  const chapterStatus = (chapter: LearnerChapter): 'done' | 'partial' | 'todo' => {
    const courseTotal = chapter.courses.length;
    const courseDone = chapter.courses.filter((course) => completedCourseIds.has(String(course.id))).length;
    if (courseTotal > 0 && courseDone >= courseTotal) return 'done';
    if (courseDone > 0) return 'partial';
    return 'todo';
  };
  const doneChapters = chapters.filter((chapter) => chapterStatus(chapter) === 'done').length;

  if (accessLoading) {
    return (
      <AppShell activeTab="code" onNavigate={(tab) => navigate(TAB_ROUTES[tab])} onOpenNotifications={() => navigate('/notifications')} onOpenProfile={() => navigate('/profil')}>
        <PageLoader />
      </AppShell>
    );
  }

  if (!accessMe?.access.code) {
    return (
      <AppShell activeTab="code" onNavigate={(tab) => navigate(TAB_ROUTES[tab])} onOpenNotifications={() => navigate('/notifications')} onOpenProfile={() => navigate('/profil')}>
        <div style={{ maxWidth: 390, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Code de la route</h1>
              <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Cours, QCM et examens blancs</div>
            </div>
            <LogoTile size="sm" />
          </div>
          <TextField
            placeholder="Rechercher un panneau, un cours…"
            leftIcon={Search}
            iconSize={19}
            style={{ height: 52, borderRadius: 26 }}
          />
          <HeroCard>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFB400', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Reprendre</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{chapterName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flexGrow: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.16)' }}>
                  <div style={{ width: `${chaptersPercent}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #0BAA4F, #FFB400)' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{done}/{total} chapitres</div>
              </div>
            </div>
            <button type="button" aria-label="Continuer le chapitre" onClick={() => navigate('/code-de-la-route/revision-chapitres')} style={{ width: 56, height: 56, flexShrink: 0, border: 0, borderRadius: 28, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(255,180,0,0.8)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            </button>
          </HeroCard>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <GlassAction tone="light" icon={<BookOpen size={21} />} label="Révision" onClick={() => navigate('/code-de-la-route/revision-chapitres')} />
            <GlassAction tone="light" icon={<Check size={21} />} label="QCM" onClick={() => navigate('/code-de-la-route/revision-chapitres')} />
            <GlassAction tone="light" icon={<ClipboardList size={21} />} label="Examens blancs" onClick={() => navigate('/code-de-la-route/examens-test')} />
            <GlassAction tone="green" icon={<GraduationCap size={21} />} label="E-Codepermis" onClick={() => navigate('/code-de-la-route')} />
          </div>
          <Card2>
            <SectionTitle>Souscrire au Code</SectionTitle>
            <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Abonnement Code : <strong>{formatXof(codePrice)}</strong> — paiement Mobile Money sécurisé.</p>
            <Button variant="accent" fullWidth rightIcon={<Search size={18} />} onClick={() => setCheckoutOpen(true)}>Payer {formatXof(codePrice)}</Button>
          </Card2>
          <MobileMoneyCheckout open={checkoutOpen} items={[{ module: 'code', quantity: 1 }]} modules={modules} defaultPhone={user.phone} onClose={() => setCheckoutOpen(false)} onSuccess={(access) => { setAccessMe(access); setCheckoutOpen(false); }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="code" onNavigate={(tab) => navigate(TAB_ROUTES[tab])} onOpenNotifications={() => navigate('/notifications')} onOpenProfile={() => navigate('/profil')}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Code de la route</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Cours, QCM et examens blancs</div>
          </div>
          <LogoTile size="sm" />
        </div>

        <TextField
          placeholder="Rechercher un panneau, un cours…"
          leftIcon={Search}
          iconSize={19}
          style={{ height: 52, borderRadius: 26 }}
        />

        <HeroCard>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFB400', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Reprendre</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{chapterName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flexGrow: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.16)' }}>
                <div style={{ width: `${chaptersPercent}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #0BAA4F, #FFB400)' }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{done}/{total} chapitres</div>
            </div>
          </div>
          <button type="button" aria-label="Continuer le chapitre" onClick={() => navigate('/code-de-la-route/revision-chapitres')} style={{ width: 56, height: 56, flexShrink: 0, border: 0, borderRadius: 28, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(255,180,0,0.8)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
          </button>
        </HeroCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <GlassAction tone="light" icon={<BookOpen size={21} />} label="Révision" onClick={() => navigate('/code-de-la-route/revision-chapitres')} />
          <GlassAction tone="light" icon={<Check size={21} />} label="QCM" onClick={() => navigate('/code-de-la-route/revision-chapitres')} />
          <GlassAction tone="light" icon={<ClipboardList size={21} />} label="Examens blancs" onClick={() => navigate('/code-de-la-route/examens-test')} />
          <GlassAction tone="green" icon={<GraduationCap size={21} />} label="E-Codepermis" onClick={() => navigate('/code-de-la-route')} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>Chapitres</h2>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>{doneChapters} sur {chapters.length} terminés</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: -6 }}>
          {chapters.length === 0 ? (
            <div style={{ borderRadius: 22, background: '#FFFFFF', padding: 18, boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)', fontSize: 13.5, fontWeight: 600, color: '#5B6680' }}>
              Aucun chapitre publié pour le moment. Ils apparaîtront ici dès leur publication.
            </div>
          ) : (
            chapters.map((chapter) => {
              const status = chapterStatus(chapter);
              return (
                <ChapterRow
                  key={chapter.id}
                  number={String(chapter.order).padStart(2, '0')}
                  title={chapter.name}
                  meta={`${chapter.courses.length} cours`}
                  status={status === 'done' ? 'Terminé' : status === 'partial' ? 'En cours' : 'À venir'}
                  statusColor={status === 'done' ? 'green' : status === 'partial' ? 'yellow' : 'default'}
                  numberBg={status === 'done' ? 'green' : status === 'partial' ? 'navy' : 'default'}
                  onClick={() => navigate(`/code-de-la-route/revision-chapitres/${chapter.id}`)}
                />
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ChapterRow({
  number,
  title,
  meta,
  status,
  statusColor,
  numberBg,
  onClick,
}: {
  number: string;
  title: string;
  meta: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'default';
  numberBg: 'green' | 'navy' | 'default';
  onClick: () => void;
}) {
  const numberStyles: Record<string, React.CSSProperties> = {
    green: { background: '#EAF7EF', color: '#067A37' },
    navy: { background: '#0A1B3D', color: '#FFB400' },
    default: { background: '#F1F4F9', color: '#8A93A8' },
  };

  const statusStyles: Record<string, React.CSSProperties> = {
    green: { background: '#EAF7EF', color: '#067A37' },
    yellow: { background: '#FFF4D6', color: '#7A5200' },
    default: { background: '#F1F4F9', color: '#5B6680' },
  };

  return (
    <button
      type="button"
      style={{
        height: 68,
        boxSizing: 'border-box',
        padding: '0 16px 0 12px',
        borderRadius: 22,
        background: '#FFFFFF',
        boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        border: 0,
      }}
      onClick={onClick}
    >
      <span style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, ...numberStyles[numberBg] }}>{number}</span>
      <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#5B6680' }}>{meta}</span>
      </span>
      <span style={{ height: 28, padding: '0 10px', borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 11.5, fontWeight: 800, ...statusStyles[statusColor] }}>{status}</span>
    </button>
  );
}

function Card2({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 26,
        background: '#FFFFFF',
        padding: 18,
        boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)',
        ...style,
      }}
      role="status"
    >
      {children}
    </div>
  );
}

function formatXof(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default CodeRoutePage;