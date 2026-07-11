import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Shuffle } from 'lucide-react'
import {
  fetchAdminPracticeExams,
  generateAdminPracticeExams,
  type AdminPracticeExamOverview,
} from '../../api/practiceExams'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'

export function ExamensTestAdminPage() {
  const [data, setData] = useState<AdminPracticeExamOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminPracticeExams(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleGenerate = async () => {
    const token = getAdminToken()
    if (!token) return
    setGenerating(true)
    setError(null)
    try {
      const result = await generateAdminPracticeExams(token)
      setSuccess(
        `${result.examCount} examens blancs générés (mélange aléatoire, ${result.requiredSize} questions / examen).`,
      )
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Génération impossible')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="admin-panel questions-page">
      <AdminSectionHeader
        backTo="/code"
        backLabel="Code de la route"
        kicker="Auto-évaluation"
        title="Examens test"
        subtitle={`${data?.examTotal ?? 24} examens blancs · ${data?.requiredSize ?? 20} questions · note /20 · moyenne ${data?.passScore ?? 14}/20`}
      />

      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="subtitle">Chargement…</p> : null}

      {data ? (
        <>
          <div className="practice-admin-stats">
            <article>
              <strong>{data.bankCount}</strong>
              <span>Questions publiées</span>
            </article>
            <article>
              <strong>
                {data.examCount}/{data.examTotal}
              </strong>
              <span>Examens formés</span>
            </article>
            <article>
              <strong>{data.passScore}/20</strong>
              <span>Seuil de réussite</span>
            </article>
            <article>
              <strong>{data.recentResults.length}</strong>
              <span>Résultats récents</span>
            </article>
          </div>

          <div className="questions-toolbar">
            <p className="questions-toolbar-meta">
              {data.ready
                ? 'Les 24 examens sont prêts. Régénérez pour re-mélanger les questions.'
                : `Il faut au moins ${data.requiredSize} questions publiées pour générer les examens.`}
            </p>
            <div className="practice-admin-actions">
              <button type="button" className="btn-outline" onClick={() => void load()}>
                <RefreshCw size={16} />
                Actualiser
              </button>
              <button
                type="button"
                className="btn-primary btn-primary-inline"
                onClick={() => void handleGenerate()}
                disabled={generating || data.bankCount < data.requiredSize}
              >
                <Shuffle size={16} />
                {generating ? 'Mélange…' : 'Mélanger & générer 24 examens'}
              </button>
            </div>
          </div>

          <div className="practice-exam-grid">
            {data.exams.length === 0 ? (
              <p className="revision-empty">Aucun examen généré pour le moment.</p>
            ) : (
              data.exams.map((exam) => (
                <div key={exam.id} className="practice-exam-chip">
                  <strong>Examen {exam.examNumber}</strong>
                  <span>{exam.questionCount} questions</span>
                </div>
              ))
            )}
          </div>

          <section className="practice-results-block">
            <h3>Notes apprenants (temps réel)</h3>
            {data.recentResults.length === 0 ? (
              <p className="subtitle">Aucune note pour le moment.</p>
            ) : (
              <div className="practice-results-list">
                {data.recentResults.map((result) => (
                  <article key={result.id} className={result.passed ? 'is-pass' : 'is-fail'}>
                    <div>
                      <strong>{result.learnerName}</strong>
                      <small>
                        Examen {result.examNumber}
                        {result.learnerEmail ? ` · ${result.learnerEmail}` : ''}
                      </small>
                    </div>
                    <span className="practice-score-pill">{result.scoreLabel}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  )
}
