import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { PageNavbar } from '../../components/PageNavbar'
import '../../styles/auth.css'
import '../../styles/learner.css'

function progressPct(done: number, total: number) {
  if (!total) return 0
  return Math.round((Math.max(0, done) / total) * 100)
}

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
            <div className="notes-layout">
              <div className="notes-summary">
                <div>
                  <strong>{progressPct(journey.code.chaptersDone, journey.code.chaptersTotal)}%</strong>
                  <span>Code</span>
                </div>
                <div>
                  <strong className="is-gold">
                    {progressPct(journey.conduite.chaptersDone, journey.conduite.chaptersTotal)}%
                  </strong>
                  <span>Conduite</span>
                </div>
                <div>
                  <strong>
                    {practice ? `${practice.passedCount}/${practice.examTotal}` : '—'}
                  </strong>
                  <span>Réussis</span>
                </div>
              </div>

              <section className="learner-notes-block">
                <h2>Où j’en suis</h2>
                <div className="notes-tracks">
                  <article className="learner-notes-stop">
                    <div className="notes-track-head">
                      <strong>Code de la route</strong>
                      <em>{progressPct(journey.code.chaptersDone, journey.code.chaptersTotal)}%</em>
                    </div>
                    <p>{journey.code.currentStop?.label ?? 'Aucun parcours code'}</p>
                    <div className="notes-bar" aria-hidden>
                      <span
                        style={{
                          width: `${progressPct(journey.code.chaptersDone, journey.code.chaptersTotal)}%`,
                        }}
                      />
                    </div>
                    <small>
                      {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
                    </small>
                  </article>
                  <article className="learner-notes-stop is-gold">
                    <div className="notes-track-head">
                      <strong>Conduite / pratique</strong>
                      <em>{progressPct(journey.conduite.chaptersDone, journey.conduite.chaptersTotal)}%</em>
                    </div>
                    <p>{journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}</p>
                    <div className="notes-bar is-gold" aria-hidden>
                      <span
                        style={{
                          width: `${progressPct(journey.conduite.chaptersDone, journey.conduite.chaptersTotal)}%`,
                        }}
                      />
                    </div>
                    <small>
                      {journey.conduite.chaptersDone}/{journey.conduite.chaptersTotal} chapitres
                      terminés
                    </small>
                  </article>
                </div>
              </section>

              <section className="learner-notes-block">
                <h2>Examens test (sur 20)</h2>
                {practice ? (
                  <p className="subtitle">
                    {practice.completedCount}/{practice.examTotal} passés · {practice.passedCount}{' '}
                    réussis · seuil {practice.passScore}/20
                  </p>
                ) : null}
                {!practice || practice.scores.length === 0 ? (
                  <div className="notes-empty">
                    <strong>Pas encore de note</strong>
                    <p>Passez un examen blanc : le résultat apparaîtra ici.</p>
                  </div>
                ) : (
                  <div className="learner-list notes-score-list">
                    {practice.scores.map((score) => (
                      <div
                        key={score.id}
                        className={`learner-item${score.passed ? ' is-done' : ' is-miss'}`}
                      >
                        <span className="learner-item-icon">{score.scoreLabel}</span>
                        <span className="learner-item-body">
                          <strong>Examen {score.examNumber}</strong>
                          <small>
                            {score.passed ? 'Réussi' : 'À retravailler'} · seuil {score.passScore}/20
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="learner-notes-block">
                <h2>Notes des sujets test</h2>
                {journey.testScores.length === 0 ? (
                  <div className="notes-empty">
                    <strong>Aucun sujet chapitre</strong>
                    <p>Les notes de chaque chapitre s’affichent dès le premier sujet terminé.</p>
                  </div>
                ) : (
                  <div className="learner-list notes-score-list">
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
