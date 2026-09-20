import { useCallback, useEffect, useState } from 'react'
import { Award, CheckCircle2, ClipboardList, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { PageNavbar } from '../../components/PageNavbar'
import { Reveal } from '../../components/Reveal'
import { AppShell, userInitialsOf } from '../../components/layout/AppShell'
import { Badge, Card, IconBadge, ProgressBar, SectionTitle, StatCard } from '../../components/ui'
import '../../styles/auth.css'
import '../../styles/learner.css'

export function MesNotesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setJourney(await fetchLearnerJourney())
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      if (!silent) setJourney(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load(true)
  })

  if (authLoading || !user) return null

  const practice = journey?.practiceExams
  const examScores = practice?.scores ?? []
  const average20 =
    examScores.length > 0
      ? (examScores.reduce((sum, s) => sum + (s.total > 0 ? s.correct / s.total : 0), 0) /
          examScores.length) *
        20
      : null
  const averageLabel =
    average20 == null ? '—' : average20.toFixed(1).replace('.', ',')
  const codeRatio =
    journey && journey.code.chaptersTotal > 0
      ? Math.max(0, Math.min(1, journey.code.chaptersDone / journey.code.chaptersTotal))
      : 0
  const conduiteRatio =
    journey && journey.conduite.chaptersTotal > 0
      ? Math.max(0, Math.min(1, journey.conduite.chaptersDone / journey.conduite.chaptersTotal))
      : 0

  return (
    <AppShell
      activeTab="progres"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Mes notes"
          icon={<FileText size={22} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <header className="auth-header learner-header mesnotes-head">
          <p className="learner-kicker">Progression</p>
          <h1>Mes notes</h1>
          <p>Avancée du parcours et notes mises à jour en temps réel.</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {journey ? (
            <>
              <Reveal delay={60}>
              <div className="mesnotes-stats">
                <StatCard icon={<Award size={14} />} label="Moyenne / 20" value={averageLabel} />
                <StatCard icon={<CheckCircle2 size={14} />} label="Réussis" value={String(practice?.passedCount ?? 0)} />
                <StatCard icon={<ClipboardList size={14} />} label="Passés" value={String(practice?.completedCount ?? 0)} />
              </div>
              </Reveal>

              <Reveal delay={120}>
              <Card className="mesnotes-track mesnotes-track--code">
                <div className="mesnotes-track-top">
                  <IconBadge icon={<FileText size={18} aria-hidden />} tone="green" />
                  <div>
                    <p className="mesnotes-track-title">Code de la route</p>
                    <p className="mesnotes-track-stop">
                      {journey.code.currentStop?.label ?? 'Aucun parcours code'}
                    </p>
                  </div>
                </div>
                <ProgressBar percent={Math.round(codeRatio * 100)} />
                <p className="mesnotes-progress-label">
                  {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
                </p>
              </Card>
              </Reveal>

              <Reveal delay={160}>
              <Card className="mesnotes-track mesnotes-track--drive">
                <div className="mesnotes-track-top">
                  <IconBadge icon={<FileText size={18} aria-hidden />} tone="orange" />
                  <div>
                    <p className="mesnotes-track-title">Conduite / pratique</p>
                    <p className="mesnotes-track-stop">
                      {journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
                    </p>
                  </div>
                </div>
                <ProgressBar percent={Math.round(conduiteRatio * 100)} />
                <p className="mesnotes-progress-label">
                  {journey.conduite.chaptersDone}/{journey.conduite.chaptersTotal} chapitres
                  terminés
                </p>
              </Card>
              </Reveal>

              <Reveal delay={200}>
              <SectionTitle>Examens test · sur 20</SectionTitle>
              </Reveal>
              {practice ? (
                <p className="subtitle" style={{ textAlign: 'center' }}>
                  {practice.completedCount}/{practice.examTotal} passés · {practice.passedCount}{' '}
                  réussis (seuil {practice.passScore}/20)
                </p>
              ) : null}
              {examScores.length === 0 ? (
                <Card className="mesnotes-empty">
                  <strong>Aucune note pour le moment</strong>
                  <p>Passez un examen blanc pour voir votre note ici en direct.</p>
                </Card>
              ) : (
                examScores.map((score, scoreIndex) => (
                  <Reveal key={score.id} delay={220 + Math.min(scoreIndex, 6) * 50}>
                  <Card className="mesnotes-score">
                    <Badge tone={score.passed ? 'green' : 'orange'}>{score.scoreLabel}</Badge>
                    <span className="mesnotes-score-body">
                      <strong>Examen {score.examNumber}</strong>
                      <small>Seuil {score.passScore}/20</small>
                    </span>
                    <Badge tone={score.passed ? 'green' : 'orange'}>
                      {score.passed ? 'Réussi' : 'À revoir'}
                    </Badge>
                  </Card>
                  </Reveal>
                ))
              )}

              <SectionTitle>Sujets test · chapitres</SectionTitle>
              {journey.testScores.length === 0 ? (
                <Card className="mesnotes-empty">
                  <strong>Aucune note de sujet chapitre</strong>
                  <p>Validez un sujet test pour voir votre score ici.</p>
                </Card>
              ) : (
                journey.testScores.map((score, testIndex) => {
                  const ratio = score.total > 0 ? score.correct / score.total : 0
                  const good = ratio >= 0.5
                  return (
                    <Reveal key={score.chapterId} delay={220 + Math.min(testIndex, 6) * 50}>
                    <Card className="mesnotes-score">
                      <Badge tone={good ? 'green' : 'orange'}>{score.scoreLabel}</Badge>
                      <span className="mesnotes-score-body">
                        <strong>{score.chapterName}</strong>
                        <small>
                          {score.correct}/{score.total} bonnes réponses
                        </small>
                      </span>
                    </Card>
                    </Reveal>
                  )
                })
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
    </AppShell>
  )
}
