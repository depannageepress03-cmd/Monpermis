import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, X } from 'lucide-react';
import { checkPracticeExamAnswer, completePracticeExam, ContentError, fetchPracticeExams, fetchRevisionChapters, startPracticeExam, type PracticeExamAttempt, type PracticeExamsOverview } from '../../api/content';
import { resolveCodeImageUrl } from '../../utils/codeImageUrl';
;
;
import { PageLoader } from '../../components/PageLoader';
;
import { Reveal } from '../../components/Reveal';
import { AppShell, userInitialsOf, type AppTab } from '../../components/layout/AppShell';
import { Button, IconBadge } from '../../components/ui';
;
import { useAuth } from '../../hooks/useAuth';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { stopAllQuizAudio } from '../../utils/quizSounds';
import { tracker } from '../../utils/tracker';
;
import { enrichAnswersFromTranscript, resolveQuestionTranscript } from '../../data/codeRoute/questionTranscripts';
import { IconButton, Button as NewButton, OptionButton } from '../../components/ui';
import { MainTabBar } from '../../components/MainTabBar';
import { LogoMark } from '../../components/icons/LogoMark';

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
};

export function ExamensTestPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PracticeExamsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPracticeExams());
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useFocusRefresh(Boolean(user), () => {
    void fetchPracticeExams()
      .then(setData)
      .catch(() => undefined);
  });

  const handleStart = async (examNumber: number) => {
    setStarting(examNumber);
    setError(null);
    try {
      const { attempt } = await startPracticeExam(examNumber);
      navigate(`/code-de-la-route/examens-test/${examNumber}`, {
        state: { attemptId: attempt.id },
      });
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Démarrage impossible');
    } finally {
      setStarting(null);
    }
  };

  if (authLoading || !user) return <PageLoader />;

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Examens test</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Conditions réelles</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : error ? (
          <div style={{ color: '#C2410C', fontSize: 14, fontWeight: 600 }}>{error}</div>
        ) : data ? (
          <>
            {data.unlocked === false ? (
              <Card2>
                <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Examens test verrouillés</h2>
                <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                  {data.message || 'Terminez tous les cours de chaque chapitre pour débloquer les examens test.'}
                </p>
                <Button variant="primary" onClick={() => navigate('/code-de-la-route/revision-chapitres')}>Continuer la révision</Button>
              </Card2>
            ) : (
              <>
                <Card2 style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <IconBadge icon={<ClipboardList size={14} />} tone="green" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{data.completedCount}/{data.examTotal} examens passés</div>
                    <div style={{ fontSize: 12, color: '#5B6680' }}>{data.passedCount}/{data.examTotal} réussis (≥ {data.passScore}/20)</div>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/code-de-la-route/mes-notes')}>Voir mes notes</Button>
                </Card2>

                <div className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data.exams ?? []).map((exam, examIndex) => (
                    <Reveal key={exam.id} delay={Math.min(examIndex, 8) * 45}>
                      <button
                        type="button"
                        style={{
                          height: 68,
                          borderRadius: 22,
                          background: '#FFFFFF',
                          boxShadow: '0 8px 22px -18px rgba(10,27,61,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '0 16px 0 12px',
                          cursor: starting === exam.examNumber ? 'wait' : 'pointer',
                          border: 0,
                        }}
                        onClick={() => handleStart(exam.examNumber)}
                        disabled={starting === exam.examNumber || data.examCount === 0}
                      >
                        <span style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, background: '#EAF7EF', color: '#067A37' }}>
                          {String(exam.examNumber).padStart(2, '0')}
                        </span>
                        <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0A1B3D' }}>Examen blanc n°{exam.examNumber}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#5B6680' }}>
                            {exam.questionCount} questions
                            {exam.score ? ` · ${exam.score.scoreLabel}` : exam.status === 'in_progress' ? ' · En cours' : ' · Disponible'}
                          </span>
                        </span>
                        <span style={{ height: 28, padding: '0 10px', borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 11.5, fontWeight: 800, background: exam.score?.passed ? '#EAF7EF' : exam.status === 'in_progress' ? '#FFF4D6' : '#EAF7EF', color: exam.score?.passed ? '#067A37' : exam.status === 'in_progress' ? '#7A5200' : '#067A37' }}>
                          {exam.score?.passed ? 'Réussi' : exam.status === 'in_progress' ? 'En cours' : 'Disponible'}
                        </span>
                      </button>
                    </Reveal>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

export function ExamensTestTakePage() {
  const navigate = useNavigate();
  const { examNumber = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<PracticeExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [, setFinalScore] = useState<{
    correct: number;
    total: number;
    scoreLabel: string;
    passed: boolean;
    passScore: number;
  } | null>(null);
  const [sequenceLive, setSequenceLive] = useState(true);
  const [, setPulseAnswerId] = useState<string | null>(null);
  /** Bonnes réponses de la question en cours, renvoyées par l'API à la validation. */
  const [correctAnswerIds, setCorrectAnswerIds] = useState<string[]>([]);
  /** Verdict de la question en cours (l'API ne renvoie pas d'explication). */
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [chapterNames, setChapterNames] = useState<Record<string, string>>({});

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const submittedRef = useRef(submitted);
  submittedRef.current = submitted;
  const checkingRef = useRef(checking);
  checkingRef.current = checking;
  const indexRef = useRef(index);
  indexRef.current = index;
  const questionsRef = useRef<PracticeExamAttempt['questions']>([]);
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const sequenceLiveRef = useRef(sequenceLive);
  sequenceLiveRef.current = sequenceLive;

  const number = Number(examNumber);

  const load = useCallback(async () => {
    if (!Number.isInteger(number) || number < 1) {
      setError('Examen invalide');
      setLoading(false);
      return;
    }
    stopAllQuizAudio();
    setLoading(true);
    setError(null);
    try {
      const { attempt: started } = await startPracticeExam(number);
      setAttempt(started);
      const answered = started.answeredCount || 0;
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)));
      setSelectedIds([]);
      setSubmitted(false);
      setAnsweredCount(answered);
      setFinished(started.status === 'completed');
      setSequenceLive(started.status !== 'completed');
      const baseContext = {
        attemptId: started.id,
        examNumber: number,
        examType: 'practice' as const,
      };
      if (started.status !== 'completed') {
        tracker.setActiveSession(baseContext);
        if (answered > 0) {
          tracker.track('exam_resume', baseContext, {
            answeredCount: answered,
            index: Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)),
          });
        } else {
          tracker.track('exam_start', baseContext, { answeredCount: 0 });
        }
        tracker.markQuestionStart();
      } else {
        tracker.setActiveSession(null);
      }
      if (started.status === 'completed') {
        setFinalScore({
          correct: started.correct,
          total: started.total,
          scoreLabel: started.scoreLabel,
          passed: started.passed,
          passScore: started.passScore,
        });
      }
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible');
      setAttempt(null);
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    setSequenceLive(true);
    setSelectedIds([]);
    setSubmitted(false);
    setCorrectAnswerIds([]);
    setLastCorrect(null);
    tracker.markQuestionStart();
  }, [index]);

  useEffect(() => {
    if (!user) return;
    void fetchRevisionChapters()
      .then((list) => {
        const map: Record<string, string> = {};
        for (const chapter of list) map[String(chapter.id)] = chapter.name;
        setChapterNames(map);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    return () => {
      tracker.setActiveSession(null);
    };
  }, []);

  useEffect(() => {
    if (finished) stopAllQuizAudio();
  }, [finished]);

  const questions = attempt?.questions || [];
  questionsRef.current = questions;
  const question = questions[index];
  const displayAnswers = useMemo(() => {
    if (!question) return [];
    const transcript = resolveQuestionTranscript({
      id: question.id,
      order: question.order,
      prompt: question.prompt,
    });
    return enrichAnswersFromTranscript(question.answers, transcript);
  }, [question]);
  const progressLabel = useMemo(() => {
    if (!questions.length) return '';
    return `Question ${Math.min(index + 1, questions.length)} / ${questions.length}`;
  }, [index, questions.length]);

  const finishOrAdvance = useCallback(async () => {
    const currentAttempt = attemptRef.current;
    const currentIndex = indexRef.current;
    const list = questionsRef.current;
    if (!currentAttempt) return;

    if (currentIndex + 1 >= list.length) {
      stopAllQuizAudio();
      setSequenceLive(false);
      try {
        const { attempt: score } = await completePracticeExam(currentAttempt.id);
        tracker.track(
          'exam_complete',
          {
            attemptId: currentAttempt.id,
            examNumber: number,
            examType: 'practice',
          },
          {
            correct: score.correct,
            total: score.total,
            passed: score.passed,
            scoreLabel: score.scoreLabel,
          },
        );
        tracker.setActiveSession(null);
        setFinalScore(score);
        setFinished(true);
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Validation impossible');
      }
      return;
    }
    stopAllQuizAudio();
    setIndex((value) => value + 1);
    setSelectedIds([]);
    setCorrectAnswerIds([]);
    setSubmitted(false);
    setSequenceLive(true);
  }, [number]);


  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentAttempt = attemptRef.current;
      const currentQuestion = questionsRef.current[indexRef.current];
      if (!currentAttempt || !currentQuestion || ids.length === 0 || checkingRef.current || submittedRef.current) return;

      setChecking(true);
      setSubmitted(true);
      setSequenceLive(false);
      stopAllQuizAudio();
      try {
        const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, ids);
        tracker.track(
          'exam_answer',
          {
            attemptId: currentAttempt.id,
            examNumber: number,
            examType: 'practice',
            questionId: currentQuestion.id,
          },
          {
            answerIds: ids,
            isCorrect: data.isCorrect,
            index: indexRef.current,
            answeredCount: data.answeredCount,
            elapsedMs: tracker.consumeElapsedMs(),
          },
        );
        setAnsweredCount(data.answeredCount);
        setCorrectAnswerIds(data.correctAnswerIds ?? []);
        setLastCorrect(data.isCorrect);
      } catch (err) {
        setSubmitted(false);
        setError(err instanceof ContentError ? err.message : 'Vérification impossible');
        setSequenceLive(selectedIdsRef.current.length === 0);
      } finally {
        setChecking(false);
      }
    },
    [finishOrAdvance, number],
  );


  const handleContinue = () => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0 || checking || submitted) return;
    setSequenceLive(false);
    stopAllQuizAudio();
    void resolveSelection(ids);
  };

  const leaveMessage =
    answeredCount > 0
      ? `Quitter ? Vos ${answeredCount} réponses sont enregistrées — reprenez via Continuer sur la même épreuve.`
      : 'Quitter ? Votre progression en cours sera conservée si vous reprenez le même examen.';
  const { confirmLeave } = useLeaveGuard(Boolean(attempt) && !finished && !loading, leaveMessage);

  if (authLoading || !user) return <PageLoader />;

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(11,170,79,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', boxSizing: 'border-box', padding: '56px 20px 28px', background: '#F5F7FB', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0A1B3D', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton
            icon={X}
            iconSize={18}
            ariaLabel="Quitter l'examen"
            onPress={() => {
              if (!confirmLeave()) return;
              const currentAttempt = attemptRef.current;
              if (currentAttempt && !finished) {
                tracker.track('exam_quit', { attemptId: currentAttempt.id, examNumber: number, examType: 'practice' }, { answeredCount, index: indexRef.current, elapsedMs: tracker.consumeElapsedMs() });
                tracker.setActiveSession(null);
              }
              navigate('/code-de-la-route/examens-test');
            }}
          />
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5B6680' }}>Examen blanc n°{number}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700 }}>{progressLabel}</div>
          </div>
          <div style={{ height: 40, padding: '0 14px', borderRadius: 20, background: '#0A1B3D', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB400" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M10 2.5h4" /></svg>00:14
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div style={{ display: 'flex', gap: 3 }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                flexGrow: 1,
                height: 6,
                borderRadius: 3,
                background: i < index + 1 ? '#0BAA4F' : i === index + 1 ? '#FFB400' : '#DDE3EE',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Question Illustration (image réelle de l'API, visuel de secours sinon) */}
        <div style={{ position: 'relative', height: 216, borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(180deg, #DDE8F8 0%, #F4F8FE 58%, #E3EBDD 58%, #D5E4CC 100%)', boxShadow: '0 16px 30px -22px rgba(10,27,61,0.45)' }}>
          {question?.prompt?.imageUrls?.[0] ? (
            <img src={resolveCodeImageUrl(question.prompt.imageUrls[0])} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="350" height="216" viewBox="0 0 350 216" fill="none" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
              <path d="M130 126h90l110 90H20z" fill="#0A1B3D" />
              <path d="M0 126h350v18H0z" fill="#0A1B3D" />
              <path d="M175 130v8M175 150v14M175 178v22" stroke="#FFB400" strokeWidth="4" strokeLinecap="round" />
              <path d="M20 135h28M70 135h28M252 135h28M302 135h28" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
              <rect x="268" y="66" width="5" height="60" rx="2" fill="#3C4760" />
              <path d="M270.5 18 302 70h-63z" fill="#FFFFFF" stroke="#D62D2D" strokeWidth="7" strokeLinejoin="round" />
              <path d="M270.5 38v24M260 50h21" stroke="#141413" strokeWidth="5" strokeLinecap="round" />
            </svg>
          )}
          <div style={{ position: 'absolute', left: 14, top: 14, height: 30, padding: '0 12px', borderRadius: 15, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800 }}>
            {chapterNames[String(question?.chapterId ?? '')] ?? 'Examen blanc'}
          </div>
        </div>

        {/* Question Text */}
        <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 19, lineHeight: 1.3, fontWeight: 700 }}>
          {question?.prompt?.text || 'Que vous indique ce panneau ?'}
        </h1>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayAnswers.map((answer) => (
            <OptionButton
              key={answer.id}
              letter={answer.label?.toUpperCase() || ''}
              state={
                submitted
                  ? correctAnswerIds.includes(answer.id)
                    ? 'correct'
                    : selectedIds.includes(answer.id)
                      ? 'incorrect'
                      : 'default'
                  : selectedIds.includes(answer.id)
                    ? 'selected'
                    : 'default'
              }
              onSelect={() => {
                if (submitted || checking) return;
                setPulseAnswerId(answer.id);
                setTimeout(() => setPulseAnswerId(null), 420);
                setSelectedIds((current) =>
                  current.includes(answer.id)
                    ? current.filter((id) => id !== answer.id)
                    : [...current, answer.id],
                );
              }}
              disabled={submitted || checking}
            >
              {answer.text}
            </OptionButton>
          ))}
        </div>

        {/* Verdict (l'API ne renvoie pas d'explication : libellé seul, jamais la couleur seule) */}
        {submitted && lastCorrect !== null && (
          <div
            role="status"
            style={
              lastCorrect
                ? { borderRadius: 22, padding: '16px 18px', background: '#EAF7EF', border: '2px solid #0BAA4F', color: '#065C2A', fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }
                : { borderRadius: 22, padding: '16px 18px', background: '#FFF1E6', border: '2px solid #C2410C', color: '#9A3412', fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700 }
            }
          >
            {lastCorrect ? 'Bonne réponse !' : 'Pas tout à fait.'}
          </div>
        )}

        {/* CTA */}
        <NewButton
          variant={submitted ? 'primary' : 'accent'}
          size="md"
          fullWidth
          disabled={checking || (!submitted && selectedIds.length === 0)}
          onClick={submitted ? finishOrAdvance : handleContinue}
          style={{ marginTop: 'auto' }}
        >
          {checking ? 'Enregistrement…' : submitted ? 'Question suivante' : 'Valider ma réponse'}
        </NewButton>

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="code" />
    </div>
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

export default ExamensTestPage;