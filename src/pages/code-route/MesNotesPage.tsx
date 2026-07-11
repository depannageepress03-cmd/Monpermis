import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
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

  // Notes à temps réel
  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      void load(true)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [user, load])

  if (authLoading || !user) return null

  const practice = journey?.practiceExams

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Mes notes & avancée"
          icon={<FileText size={22} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Progression</p>
          <p>Avancée du parcours et notes des examens test mises à jour en temps réel.</p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {journey ? (
            <>
              <section className="learner-notes-block">
                <h2>Où j’en suis</h2>
                <div className="learner-notes-stop">
                  <strong>Code de la route</strong>
                  <p>{journey.code.currentStop?.label ?? 'Aucun parcours code'}</p>
                  <small>
                    {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
                  </small>
                </div>
                <div className="learner-notes-stop">
                  <strong>Conduite / pratique</strong>
                  <p>{journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}</p>
                  <small>
                    {journey.conduite.chaptersDone}/{journey.conduite.chaptersTotal} chapitres
                    terminés
                  </small>
                </div>
              </section>

              <section className="learner-notes-block">
                <h2>Examens test (sur 20)</h2>
                {practice ? (
                  <p className="subtitle">
                    {practice.completedCount}/{practice.examTotal} passés · {practice.passedCount}{' '}
                    réussis (seuil {practice.passScore}/20)
                  </p>
                ) : null}
                {!practice || practice.scores.length === 0 ? (
                  <p className="subtitle">
                    Aucune note d’examen test pour le moment. Passez un examen blanc pour la voir
                    ici en direct.
                  </p>
                ) : (
                  <div className="learner-list">
                    {practice.scores.map((score) => (
                      <div
                        key={score.id}
                        className={`learner-item${score.passed ? ' is-done' : ''}`}
                      >
                        <span className="learner-item-icon">{score.scoreLabel}</span>
                        <span className="learner-item-body">
                          <strong>Examen {score.examNumber}</strong>
                          <small>
                            {score.passed ? 'Réussi' : 'Non réussi'} · seuil {score.passScore}/20
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="learner-notes-block">
                <h2>Notes des sujets test (chapitres)</h2>
                {journey.testScores.length === 0 ? (
                  <p className="subtitle">
                    Aucune note de sujet chapitre pour le moment.
                  </p>
                ) : (
                  <div className="learner-list">
                    {journey.testScores.map((score) => (
                      <div key={score.chapterId} className="learner-item is-done">
                        <span className="learner-item-icon">{score.scoreLabel}</span>
                        <span className="learner-item-body">
                          <strong>{score.chapterName}</strong>
                          <small>
                            {score.correct}/{score.total} bonnes réponses
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
