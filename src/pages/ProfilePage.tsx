import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchLearnerJourney, fetchPracticeExamScores, type LearnerJourney, type PracticeExamScore } from '../api/content';
import { fetchDrivingDashboard } from '../api/reservations';
import { Button, Chip, ProgressRing, ProgressRingCenter, NotchedCard } from '../components/ui';
import { MainTabBar } from '../components/MainTabBar';
;

function formatDateLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function formatTimeLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [journey, setJourney] = useState<LearnerJourney | null>(null);
  const [examScores, setExamScores] = useState<PracticeExamScore[]>([]);
  const [drivingDone, setDrivingDone] = useState(0);
  const [drivingTotal, setDrivingTotal] = useState(20);
  const [periodFilter, setPeriodFilter] = useState<'7 jours' | '30 jours' | 'Tout'>('30 jours');

  const cyclePeriod = () => {
    setPeriodFilter((current) =>
      current === '7 jours' ? '30 jours' : current === '30 jours' ? 'Tout' : '7 jours',
    );
  };

  const visibleScores = useMemo(() => {
    if (periodFilter === 'Tout') return examScores;
    const days = periodFilter === '7 jours' ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    return examScores.filter((score) => {
      if (!score.completedAt) return true;
      const time = new Date(score.completedAt).getTime();
      return Number.isNaN(time) || time >= cutoff;
    });
  }, [examScores, periodFilter]);

  useEffect(() => {
    if (!user) return;
    void fetchLearnerJourney().then(setJourney).catch(() => setJourney(null));
    void fetchPracticeExamScores()
      .then((data) => setExamScores(data.scores ?? []))
      .catch(() => setExamScores([]));
    void fetchDrivingDashboard()
      .then((data) => {
        setDrivingDone(data.progress.heuresEffectuees ?? 0);
        setDrivingTotal(data.progress.heuresObjectif ?? 20);
      })
      .catch(() => {});
  }, [user]);

  const { courseRatio, examRatio, driveRatio, percent, delta } = useMemo(() => {
    const code = journey?.code;
    const codeTotal = code?.chaptersTotal ?? 0;
    const coursePct = codeTotal > 0 ? (code.chaptersDone ?? 0) / codeTotal : 0;

    const exams = journey?.practiceExams;
    const examPct = exams && exams.examTotal > 0 ? Math.min(1, (exams.passedCount ?? 0) / exams.examTotal) : 0;

    const drivePct = drivingTotal > 0 ? Math.min(1, drivingDone / drivingTotal) : 0;

    const last = visibleScores[visibleScores.length - 1];
    const prev = visibleScores[visibleScores.length - 2];
    const examDelta = last && prev ? last.correct - prev.correct : null;

    return {
      courseRatio: coursePct,
      examRatio: examPct,
      driveRatio: drivePct,
      percent: Math.round(coursePct * 100),
      delta: examDelta,
    };
  }, [journey, visibleScores, drivingDone, drivingTotal]);

  if (loading || !user) return null;

  const lastExam = visibleScores[visibleScores.length - 1];
  const lastExamErrors = lastExam ? Math.max(0, lastExam.total - lastExam.correct) : 0;

  const codeDone = journey?.code?.chaptersDone ?? 0;
  const codeTotal = journey?.code?.chaptersTotal ?? 60;
  const examsPassed = journey?.practiceExams?.passedCount ?? 0;
  const examsTotal = journey?.practiceExams?.examTotal ?? 40;

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #FFFFFF 0%, #EAEFF6 46%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 120, left: 50, width: 290, height: 290, borderRadius: '50%', background: 'rgba(11,170,79,0.10)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Ma progression</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Code, examens et conduite</div>
          </div>
          <Button variant="outline" size="sm" leftIcon={ChevronDown} onClick={cyclePeriod} aria-label="Changer la période" style={{ height: 40, borderRadius: 20, border: '1.5px solid #E1E6EF', background: '#FFFFFF' }}>
            {periodFilter}
          </Button>
        </div>

        {/* ProgressRing */}
        <div style={{ position: 'relative', height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing
            segments={[
              { color: '#0BAA4F', value: courseRatio, max: 1 },
              { color: '#0A1B3D', value: examRatio, max: 1 },
              { color: '#FFB400', value: driveRatio, max: 1 },
            ]}
          >
            <ProgressRingCenter
              percentage={percent}
              label="prête pour l'examen"
              trend={delta != null && delta !== 0 ? { value: `${delta > 0 ? '+' : ''}${delta} pts`, icon: <TrendingUp size={13} strokeWidth={2.6} /> } : undefined}
            />
          </ProgressRing>
        </div>

        {/* Mini cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ borderRadius: 18, background: '#FFFFFF', padding: '10px 12px', boxShadow: '0 8px 22px -18px rgba(10,27,61,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#5B6680' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: '#0BAA4F' }} />
              Cours
            </span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {codeDone}<span style={{ color: '#8A93A8', fontSize: 13 }}>/{codeTotal}</span>
            </span>
          </div>
          <div style={{ borderRadius: 18, background: '#FFFFFF', padding: '10px 12px', boxShadow: '0 8px 22px -18px rgba(10,27,61,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#5B6680' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: '#0A1B3D' }} />
              Examens
            </span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {examsPassed}<span style={{ color: '#8A93A8', fontSize: 13 }}>/{examsTotal} moy.</span>
            </span>
          </div>
          <div style={{ borderRadius: 18, background: '#FFFFFF', padding: '10px 12px', boxShadow: '0 8px 22px -18px rgba(10,27,61,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#5B6680' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FFB400' }} />
              Conduite
            </span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {drivingDone}<span style={{ color: '#8A93A8', fontSize: 13 }}>/{drivingTotal} h</span>
            </span>
          </div>
        </div>

        {/* Activité récente */}
        <h2 style={{ margin: '6px 0 0', fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>Activité récente</h2>

        {lastExam ? (
          <NotchedCard
            tabLabel="Examen blanc"
            tabColor="#0A1B3D"
            time={formatTimeLabel(lastExam.completedAt)}
            date={formatDateLabel(lastExam.completedAt)}
          >
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700 }}>Examen blanc n°{lastExam.examNumber}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip variant="yellow" size="sm">{lastExam.correct}/{lastExam.total}</Chip>
              <Chip variant={lastExam.passed ? 'green' : 'glass'} size="sm">{lastExam.passed ? 'Réussi' : 'À revoir'}</Chip>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.14)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              <span>{lastExamErrors} erreur{lastExamErrors > 1 ? 's' : ''} à revoir</span>
            </div>
          </NotchedCard>
        ) : (
          <div style={{ borderRadius: 26, background: '#FFFFFF', padding: 18, boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)' }}>
            <p style={{ color: '#5B6680', fontSize: 13.5 }}>Passe ton premier examen blanc pour voir tes résultats ici.</p>
            <Button variant="outline" onClick={() => navigate('/code-de-la-route/examens-test')}>Voir les examens</Button>
          </div>
        )}

        {journey?.code?.currentStop?.type === 'done' ? (
          <NotchedCard
            tabLabel="Cours terminé"
            tabColor="#DDF3E6"
            tone="light"
            tabIcon={<span style={{ width: 8, height: 8, borderRadius: 4, background: '#0BAA4F' }} />}
            date={formatDateLabel(new Date().toISOString())}
          >
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700 }}>{journey.code.currentStop.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#3C4760' }}>
              {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
            </div>
          </NotchedCard>
        ) : null}

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="progres" />
    </div>
  );
}

export default ProfilePage;