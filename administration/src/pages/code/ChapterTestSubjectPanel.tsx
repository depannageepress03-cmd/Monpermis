import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  deleteTestSubject,
  fetchCurrentTestSubject,
  generateTestSubject,
  updateTestSubject,
} from '../../api/questions'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { TestSubject } from '../../types/questions'

function formatGeneratedAt(value?: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

export function ChapterTestSubjectPanel({ chapterId }: { chapterId: string }) {
  const [subject, setSubject] = useState<TestSubject | null>(null)
  const [bankCount, setBankCount] = useState(0)
  const [requiredCount, setRequiredCount] = useState(20)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      const data = await fetchCurrentTestSubject(token, chapterId)
      setSubject(data.subject)
      setBankCount(data.bankCount)
      setRequiredCount(data.requiredCount)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId])

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
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await generateTestSubject(token, chapterId)
      setSubject(data.subject)
      setBankCount(data.bankCount)
      setRequiredCount(data.requiredCount)
      setExpandedId(null)
      setSuccess(`Sujet test généré — ${data.subject.questionCount} questions tirées au hasard.`)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Génération impossible')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublishToggle = async (published: boolean) => {
    if (!subject) return
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const { subject: updated } = await updateTestSubject(token, chapterId, subject.id, {
        published,
      })
      setSubject(updated)
      setSuccess(published ? 'Sujet test publié pour les apprenants.' : 'Sujet test dépublié.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!subject) return
    if (!window.confirm('Supprimer ce sujet test ?')) return

    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await deleteTestSubject(token, chapterId, subject.id)
      setSubject(null)
      setExpandedId(null)
      setSuccess('Sujet test supprimé.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  const canGenerate = bankCount >= requiredCount

  return (
    <div className="revision-questions-panel">
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <div className="revision-test-subject-meta">
        <div>
          <p className="revision-test-subject-kicker">Évaluation du chapitre</p>
          <p className="revision-test-subject-summary">
            Banque : {bankCount} question{bankCount !== 1 ? 's' : ''} · Sujet : {requiredCount}{' '}
            questions aléatoires
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-primary-inline"
          onClick={() => void handleGenerate()}
          disabled={generating || !canGenerate}
          title={
            canGenerate
              ? 'Tirer 20 questions au hasard'
              : `Ajoutez au moins ${requiredCount} questions`
          }
        >
          <RefreshCw size={16} />
          {generating
            ? 'Génération…'
            : subject
              ? 'Régénérer le sujet'
              : 'Générer un sujet test'}
        </button>
      </div>

      {!canGenerate ? (
        <p className="revision-empty">
          Il faut au moins {requiredCount} questions dans la banque pour générer un sujet test
          (actuellement {bankCount}).
        </p>
      ) : null}

      {loading ? (
        <p className="revision-empty">Chargement du sujet test…</p>
      ) : !subject ? (
        canGenerate ? (
          <p className="revision-empty">
            Aucun sujet test pour ce chapitre. Cliquez sur « Générer un sujet test ».
          </p>
        ) : null
      ) : (
        <>
          <div className="revision-course">
            <div className="revision-course-header">
              <div className="revision-course-toggle" style={{ cursor: 'default' }}>
                <ClipboardList size={18} />
                <span>Sujet test actuel</span>
                <span className="revision-count">{subject.questionCount} questions</span>
                {!subject.published ? <span className="revision-tag">Brouillon</span> : null}
              </div>
              <div className="revision-item-actions">
                <PublishSwitch
                  checked={subject.published}
                  onChange={(published) => void handlePublishToggle(published)}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="btn-text-danger"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                  aria-label="Supprimer le sujet test"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </div>
            <div className="revision-course-body">
              <p className="revision-test-subject-date">
                Généré le {formatGeneratedAt(subject.createdAt)}
              </p>
            </div>
          </div>

          <div className="revision-courses-stack">
            {subject.questions.map((question, index) => {
              const expanded = expandedId === question.id
              return (
                <div key={question.id} className="revision-course">
                  <div className="revision-course-header">
                    <button
                      type="button"
                      className="revision-course-toggle"
                      onClick={() =>
                        setExpandedId((current) => (current === question.id ? null : question.id))
                      }
                    >
                      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <HelpCircle size={18} />
                      <span>
                        Q{index + 1} · Question {index + 1}
                      </span>
                      <span className="revision-count">
                        {question.answers.length} réponse
                        {question.answers.length !== 1 ? 's' : ''}
                      </span>
                      {!question.published ? <span className="revision-tag">Brouillon</span> : null}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="revision-course-body">
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
                              {answer.label.toUpperCase()}. Audio
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
        </>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
