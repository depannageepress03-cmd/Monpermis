import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle, RefreshCw, Shuffle, X } from 'lucide-react'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { resolveMediaUrl } from '../../utils/mediaUrl'

interface ExamItem {
  id: string
  examNumber: number
  questionCount: number
  published: boolean
  updatedAt?: string
}

interface RecentResult {
  id: string
  examNumber: number
  correct: number
  total: number
  scoreLabel: string
  passed: boolean
  passScore: number
  completedAt?: string | null
  learnerName: string
  learnerEmail: string
}

interface ExamOverview {
  bankCount: number
  requiredSize: number
  examTotal: number
  passScore: number
  examCount: number
  ready: boolean
  exams: ExamItem[]
  recentResults: RecentResult[]
}

interface ExamWithQuestions extends ExamItem {
  questions: {
    id: string
    order: number
    published: boolean
    prompt: { text: string; audioUrl: string; imageUrls: string[] }
    answers: { label: string; text: string; audioUrl: string; isCorrect: boolean }[]
  }[]
  createdAt?: string
  updatedAt?: string
}

interface BaseExamConfig {
  title: string
  kicker: string
  itemLabel: string
  itemsLabel: string
  fetchOverview: (token: string) => Promise<ExamOverview>
  generateExams: (token: string) => Promise<{ examCount: number; requiredSize: number; exams: ExamItem[] }>
  fetchExamById: (token: string, examId: string) => Promise<{ exam: ExamWithQuestions }>
  updateExam: (token: string, examId: string, payload: { published: boolean }) => Promise<{ exam: ExamWithQuestions }>
  backTo: string
  backLabel: string
}

export function BaseExamAdminPage(config: BaseExamConfig) {
  const [data, setData] = useState<ExamOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [detailExam, setDetailExam] = useState<ExamWithQuestions | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

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
      setData(await config.fetchOverview(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [config.fetchOverview])

  useEffect(() => {
    void load()
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
    setSuccess(null)
    try {
      const result = await config.generateExams(token)
      setSuccess(
        `${result.examCount} ${config.itemsLabel} généré(e)s (mélange aléatoire, ${result.requiredSize} questions / ${config.itemLabel}).`,
      )
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Génération impossible')
    } finally {
      setGenerating(false)
    }
  }

  const handleViewDetail = async (examId: string) => {
    const token = getAdminToken()
    if (!token) return
    setDetailLoading(true)
    setError(null)
    try {
      const { exam } = await config.fetchExamById(token, examId)
      setDetailExam(exam)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePublishToggle = async (examId: string, published: boolean) => {
    const token = getAdminToken()
    if (!token) return
    try {
      await config.updateExam(token, examId, { published })
      setSuccess(published ? `${config.itemLabel} publié(e).` : `${config.itemLabel} dépublié(e).`)
      if (detailExam && detailExam.id === examId) {
        setDetailExam((prev) => prev ? { ...prev, published } : null)
      }
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    }
  }

  return (
    <section className="admin-panel questions-page">
      <AdminSectionHeader
        backTo={config.backTo}
        backLabel={config.backLabel}
        kicker={config.kicker}
        title={config.title}
      />

      {success ? (
        <p className="form-success" role="status">{success}</p>
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
              <strong>{data.examCount}/{data.examTotal}</strong>
              <span>{config.itemsLabel} formé(e)s</span>
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
                ? `Les ${data.examTotal} ${config.itemsLabel} sont prêt(e)s. Régénérez pour re-mélanger les questions.`
                : `Il faut au moins ${data.requiredSize} questions publiées pour générer les ${config.itemsLabel}.`}
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
                {generating ? 'Mélange…' : `Mélanger & générer ${data.examTotal} ${config.itemsLabel}`}
              </button>
            </div>
          </div>

          <div className="practice-exam-grid">
            {data.exams.length === 0 ? (
              <p className="revision-empty">Aucun(e) {config.itemLabel} généré(e) pour le moment.</p>
            ) : (
              data.exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  className="practice-exam-chip"
                  onClick={() => void handleViewDetail(exam.id)}
                  title={`Voir les questions de ${config.itemLabel} ${exam.examNumber}`}
                >
                  <strong>{config.itemLabel} {exam.examNumber}</strong>
                  <span>{exam.questionCount} questions</span>
                  {!exam.published ? <span className="revision-tag">Brouillon</span> : null}
                </button>
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
                        {config.itemLabel} {result.examNumber}
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

      {detailExam ? (
        <div className="modal-backdrop" onClick={() => setDetailExam(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{config.itemLabel} {detailExam.examNumber}</h2>
              <div className="modal-header-actions">
                <PublishSwitch
                  checked={detailExam.published}
                  onChange={(published) => void handlePublishToggle(detailExam.id, published)}
                />
                <button type="button" className="btn-text-danger" onClick={() => setDetailExam(null)} aria-label="Fermer">
                  <X size={20} />
                </button>
              </div>
            </div>
            <p className="subtitle">{detailExam.questionCount} questions</p>
            {detailLoading ? (
              <p className="subtitle">Chargement des questions…</p>
            ) : (
              <div className="revision-courses-stack">
                {(detailExam.questions || []).map((question, index) => {
                  const expanded = expandedQuestionId === question.id
                  return (
                    <div key={question.id} className="revision-course">
                      <div className="revision-course-header">
                        <button
                          type="button"
                          className="revision-course-toggle"
                          onClick={() =>
                            setExpandedQuestionId((current) => (current === question.id ? null : question.id))
                          }
                        >
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <HelpCircle size={18} />
                          <span>Q{index + 1}</span>
                          <span className="revision-count">
                            {question.answers.length} réponse{question.answers.length !== 1 ? 's' : ''}
                          </span>
                          {!question.published ? <span className="revision-tag">Brouillon</span> : null}
                        </button>
                      </div>
                      {expanded ? (
                        <div className="revision-course-body">
                          {question.prompt.text ? <p>{question.prompt.text}</p> : null}
                          {question.prompt.audioUrl ? (
                            <audio controls src={resolveMediaUrl(question.prompt.audioUrl)} />
                          ) : null}
                          {question.prompt.imageUrls.length > 0 ? (
                            <div className="question-images">
                              {question.prompt.imageUrls.map((url) => (
                                <img key={url} src={resolveMediaUrl(url)} alt="" className="question-preview-image" />
                              ))}
                            </div>
                          ) : null}
                          <ul className="question-answers-preview">
                            {question.answers.map((answer) => (
                              <li key={`${question.id}-${answer.label}`}>
                                <span className={answer.isCorrect ? 'is-correct' : undefined}>
                                  {answer.label.toUpperCase()}. {answer.text || '—'}
                                  {answer.isCorrect ? ' ✓' : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 720px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .modal-header h2 {
          margin: 0;
        }
        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .practice-exam-chip {
          cursor: pointer;
          transition: box-shadow 0.15s;
          border: 1px solid #e0e0e0;
          background: #fff;
          text-align: left;
        }
        .practice-exam-chip:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
      `}</style>
    </section>
  )
}