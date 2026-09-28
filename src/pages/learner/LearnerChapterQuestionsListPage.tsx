import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, HelpCircle, Target, Trophy } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ContentError, fetchRevisionChapterQuestions, fetchRevisionChapters, fetchRevisionProgressFull, type LearnerQuestion, type TestProgressEntry } from '../../api/content';
import { PageNavbar } from '../../components/PageNavbar';
import { Reveal } from '../../components/Reveal';
import { AppShell, userInitialsOf } from '../../components/layout/AppShell';
import { Badge, Button, Card, IconBadge, SectionTitle, StatCard } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { unlockQuizAudio } from '../../utils/quizSounds';

export function LearnerChapterQuestionsListPage() {
  const navigate = useNavigate();
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const stateChapterName =
    (location.state as { chapterName?: string } | null)?.chapterName || '';
  const [chapterName, setChapterName] = useState(stateChapterName || 'Chapitre');
  const [questions, setQuestions] = useState<LearnerQuestion[]>([]);
  const [testEntry, setTestEntry] = useState<TestProgressEntry | null>(null);
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
      const [list, progress] = await Promise.all([
        fetchRevisionChapterQuestions(chapterId),
        fetchRevisionProgressFull(chapterId).catch(() => null),
      ]);
      setQuestions(list);
      setTestEntry(
        progress?.completedTests?.find((item) => item.chapterId === chapterId) || null,
      );
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible');
      setQuestions([]);
      setTestEntry(null);
    } finally {
      setLoading(false);
    }
  }, [chapterId, stateChapterName]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading || !user) return null;

  const count = questions.length;
  const testRatio =
    testEntry && testEntry.total > 0
      ? Math.max(0, Math.min(1, testEntry.correct / testEntry.total))
      : null;

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div className="auth-page">
        <div className="auth-container learner-container">
          <PageNavbar
            title={chapterName}
            icon={<HelpCircle size={22} />}
            onBack={() => navigate('/code-de-la-route/revision-chapitres')}
          />

          <header className="auth-header learner-header">
            <p className="learner-kicker">Entraînement</p>
            <SectionTitle>Questions</SectionTitle>
            <p>
              {loading
                ? 'Chargement…'
                : count > 0
                ? 'Choisissez une question pour vous entraîner.'
                : 'Aucune question publiée pour ce chapitre.'}
            </p>
          </header>

          <div className="auth-card learner-card">
            {error ? <p className="form-error">{error}</p> : null}

            <Reveal delay={60}>
            <div className="learner-hub-duo">
              <Card style={{ background: '#EAF7EF', border: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
                <IconBadge icon={<HelpCircle size={20} />} tone="green" />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Questions</span>
                <Badge variant="green" size="sm">
                  {count > 0 ? `${count} questions` : 'Entraînement'}
                </Badge>
              </Card>
              <Link
                to={`/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`}
                state={{ chapterName }}
                onClick={() => unlockQuizAudio()}
                style={{ textDecoration: 'none' }}
              >
                <Card style={{ background: '#FFF4D6', border: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
                  <IconBadge icon={<ClipboardList size={20} />} tone="yellow" />
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Sujet test</span>
                  <Badge variant="yellow" size="sm">
                    {testEntry
                      ? `${testEntry.correct}/${testEntry.total}`
                      : 'Validez le chapitre'}
                  </Badge>
                </Card>
              </Link>
            </div>
            </Reveal>

            {!loading && !error && count === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <SectionTitle>Aucune question</SectionTitle>
                <p className="subtitle">Les questions publiées de ce chapitre apparaîtront ici.</p>
              </div>
            ) : null}

            {!loading && !error && count > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                  <StatCard
                    icon={<HelpCircle size={14} />}
                    label="Questions"
                    value={String(count)}
                  />
                  {testRatio != null ? (
                    <StatCard
                      icon={<Target size={14} />}
                      label="Sujet test"
                      value={`${Math.round(testRatio * 100)}%`}
                    />
                  ) : null}
                  {testEntry ? (
                    <StatCard
                      icon={<Trophy size={14} />}
                      label="Meilleur score"
                      value={`${testEntry.correct}/${testEntry.total}`}
                    />
                  ) : null}
                </div>
                {testEntry ? (
                  <Badge variant="green" style={{ display: 'inline-block', marginTop: 12 }}>
                    Sujet test : {testEntry.correct} / {testEntry.total}
                  </Badge>
                ) : null}
                <div style={{ marginTop: 16 }}>
                  {questions.map((question, index) => (
                    <Reveal key={question.id} delay={100 + Math.min(index, 10) * 30}>
                    <Card style={{ marginBottom: 10 }}>
                    <Link
                      to={`/code-de-la-route/revision-chapitres/${chapterId}/questions/${index}`}
                      state={{ chapterName }}
                      onClick={() => unlockQuizAudio()}
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}
                    >
                      <span style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, background: '#EAF7EF', color: '#067A37' }}>
                        {index + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>
                        Question {index + 1}
                      </span>
                      <Button variant="icon" tone="green" style={{ opacity: 0.5 }}>
                        <ChevronRight size={16} />
                      </Button>
                    </Link>
                    </Card>
                    </Reveal>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default LearnerChapterQuestionsListPage;