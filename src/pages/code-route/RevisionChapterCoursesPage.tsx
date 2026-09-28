import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Layers, Lock } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ContentError, fetchRevisionChapters, fetchRevisionProgress, type LearnerChapter, type LearnerCourse } from '../../api/content';
import { PageNavbar } from '../../components/PageNavbar';
import { useAuth } from '../../hooks/useAuth';
import { AppShell, userInitialsOf } from '../../components/layout/AppShell';
import { Badge, Button, Card, SectionTitle, StatCard } from '../../components/ui';
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel';
import '../../styles/auth.css';
import '../../styles/learner.css';


export function RevisionChapterCoursesPage() {
  const navigate = useNavigate();
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const stateChapter = (location.state as { chapter?: LearnerChapter } | null)?.chapter;

  const [chapter, setChapter] = useState<LearnerChapter | null>(stateChapter ?? null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!stateChapter);
  const [error, setError] = useState<string | null>(null);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chapters = await fetchRevisionChapters();
      const chapterIndex = chapters.findIndex((item) => String(item.id) === String(chapterId));
      const found = chapterIndex >= 0 ? chapters[chapterIndex] : null;
      setChapter(
        found
          ? { ...found, name: `${chapterIndex + 1}. ${found.name}` }
          : null,
      );
      if (!found) {
        setError('Chapitre introuvable ou non publié');
        return;
      }
      const progress = await fetchRevisionProgress(chapterId);
      setCompletedIds(new Set(progress.map((entry) => String(entry.courseId))));
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const courses = chapter?.courses ?? [];

  const isUnlocked = useMemo(() => {
    return (_index: number) => true;
  }, []);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EAEFF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#5B6680' }}>Chargement…</p>
      </div>
    );
  }

  if (!user) return null;

  const doneCount = courses.filter((course) =>
    completedIds.has(String(course.id)),
  ).length;

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PageNavbar
          title={formatChapterHeading(chapter?.name ?? 'Cours')}
          icon={<Layers size={20} />}
          onBack={() => navigate('/code-de-la-route/revision-chapitres')}
        />

        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#0BAA4F' }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FFB400' }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#0A1B3D' }} />
          </div>
          <SectionTitle>Accédez aux cours librement, à votre rythme.</SectionTitle>
          <p style={{ color: '#5B6680', fontSize: 13.5, lineHeight: 1.5 }}>Prenez le temps de bien comprendre chaque notion.</p>
          {!loading && !error && courses.length > 0 ? (
            <StatCard icon={<Check size={14} />} label="Cours terminés" value={`${doneCount}/${courses.length}`} />
          ) : null}
        </header>

        <div style={{ borderRadius: 26, background: '#FFFFFF', padding: 18, boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Chargement…</p> : null}
          {error ? <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{error}</p> : null}
          {lockHint ? <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{lockHint}</p> : null}
          {!loading && !error && courses.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <SectionTitle>Aucun cours</SectionTitle>
              <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Ce chapitre ne contient pas encore de cours publiés.</p>
            </div>
          ) : null}
          {!loading && !error ? (
            <div className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.map((course: LearnerCourse, index) => {
                const unlocked = isUnlocked(index);
                const completed = completedIds.has(String(course.id));
                const content = (
                  <>
                    <span style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, background: unlocked ? (completed ? '#EAF7EF' : '#E8EDF6') : '#F1F4F9', color: unlocked ? (completed ? '#067A37' : '#0A1B3D') : '#8A93A8' }}>
                      {completed ? (
                        <Check size={20} />
                      ) : !unlocked ? (
                        <Lock size={20} />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <strong style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>
                        {formatCourseHeading(index, course.title)}
                      </strong>
                      {completed ? (
                        <Badge variant="green" size="sm" icon={<Check size={12} />}>Terminé</Badge>
                      ) : !unlocked ? (
                        <Badge variant="yellow" size="sm" icon={<Lock size={12} />}>Verrouillé — terminez le cours précédent</Badge>
                      ) : (
                        <small style={{ color: '#5B6680' }}>Appuyez pour ouvrir</small>
                      )}
                    </span>
                    {unlocked ? (
                      <Button variant="icon" tone="green" style={{ opacity: 0.5 }}>
                        <ChevronRight size={16} />
                      </Button>
                    ) : (
                      <Lock size={16} />
                    )}
                  </>
                );

                if (!unlocked) {
                  return (
                    <Button
                      key={course.id}
                      variant="outline"
                      style={{ animationDelay: `${0.22 + index * 0.08}s` }}
                      onClick={() =>
                        setLockHint(
                          'Ce cours est verrouillé. Validez le cours précédent (case "J\'ai terminé ce cours") pour le débloquer.',
                        )
                      }
                    >
                      {content}
                    </Button>
                  );
                }

                return (
                  <Card key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <Link
                    to={`/code-de-la-route/revision-chapitres/${chapterId}/cours/${course.id}`}
                    state={{ chapter, course, courses }}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}
                    onClick={() => setLockHint(null)}
                  >
                    {content}
                  </Link>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default RevisionChapterCoursesPage;