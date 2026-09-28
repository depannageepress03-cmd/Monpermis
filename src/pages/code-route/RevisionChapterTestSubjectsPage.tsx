import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ContentError, fetchRevisionChapters, fetchRevisionChapterTestSubjects, type LearnerTestSubjectSummary } from '../../api/content';
;
import { Reveal } from '../../components/Reveal';
import { AppShell, userInitialsOf } from '../../components/layout/AppShell';
import { Badge, Card, IconBadge, StatCard } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

export function RevisionChapterTestSubjectsPage() {
  const navigate = useNavigate();
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || '';
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre');
  const [subjects, setSubjects] = useState<LearnerTestSubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!stateChapterName) {
        const chapters = await fetchRevisionChapters();
        const chapterIndex = chapters.findIndex((item) => item.id === chapterId);
        if (chapterIndex >= 0) {
          setChapterName(`${chapterIndex + 1}. ${chapters[chapterIndex].name}`);
        }
      } else {
        setChapterName(stateChapterName);
      }
      const data = await fetchRevisionChapterTestSubjects(chapterId);
      setSubjects(data.subjects || []);
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [chapterId, stateChapterName]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EAEFF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#5B6680' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Sujets test</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>{chapterName}</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="62" height="62" viewBox="0 0 170 200" fill="none"><path d="M20 200 L150 0H174L70 200Z" fill="#0A1B3D"/><path d="M130 46L121 60M110 78L101 92M90 110L81 124M70 142L61 156" stroke="#FFB400" strokeWidth="5" strokeLinecap="round"/></svg>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to={`/code-de-la-route/revision-chapitres/${chapterId}/questions`} state={{ chapterName }} style={{ textDecoration: 'none' }}>
              <Card style={{ background: '#EAF7EF', border: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
                <IconBadge icon={<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>} tone="green" />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Questions</span>
                <Badge variant="green" size="sm">Entraînement</Badge>
              </Card>
            </Link>
            <Card style={{ background: '#FFF4D6', border: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
              <IconBadge icon={<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>} tone="yellow" />
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Sujet test</span>
              <Badge variant="yellow" size="sm">
                {subjects.length > 0 ? `${subjects.length} sujet${subjects.length > 1 ? 's' : ''}` : 'Évaluation'}
              </Badge>
            </Card>
          </div>

          {!loading && !error && subjects.length === 0 ? (
            <Card style={{ padding: '24px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Aucun sujet test</h2>
              <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Aucune question publiée pour ce chapitre. Publiez des questions dans l'admin.</p>
            </Card>
          ) : null}

          {!loading && !error && subjects.length > 0 ? (
            <StatCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>} label="Sujets test" value={String(subjects.length)} />
          ) : null}

          {!loading && !error && subjects.length > 0 ? (
            <div className="mp-grid-desktop" style={{ display: 'grid', gap: 12 }}>
              {subjects.map((subject, subjectIndex) => (
                <Reveal key={subject.id || subject.number} delay={100 + Math.min(subjectIndex, 6) * 50}>
                <Card>
                  <Link
                    to={`/code-de-la-route/revision-chapitres/${chapterId}/sujet-test/${subject.number}`}
                    state={{ chapterName }}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}
                  >
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>{subject.label}</span>
                    <Badge variant="green" size="sm">
                      {subject.questionCount} question{subject.questionCount !== 1 ? 's' : ''}
                    </Badge>
                  </Link>
                </Card>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default RevisionChapterTestSubjectsPage;