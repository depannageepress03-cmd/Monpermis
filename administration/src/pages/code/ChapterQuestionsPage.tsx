import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, HelpCircle, Volume2 } from 'lucide-react'
import { fetchChapterQuestions } from '../../api/questions'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { EmptyState } from '../../ui'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { ChapterQuestion } from '../../types/questions'

export function ChapterQuestionsPage() {
  const { chapterId = '' } = useParams()
  const [chapterName, setChapterName] = useState('')
  const [questions, setQuestions] = useState<ChapterQuestion[]>([])
  const [hardcoded, setHardcoded] = useState(false)
  const [awaitingFiles, setAwaitingFiles] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadQuestions = useCallback(async () => {
    if (!chapterId) return
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchChapterQuestions(token, chapterId)
      setChapterName(data.chapter.name)
      setQuestions(data.questions)
      setHardcoded(Boolean(data.hardcoded))
      setAwaitingFiles(Boolean(data.awaitingFiles))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const correctSummary = useMemo(
    () =>
      questions.map((question) => ({
        id: question.id,
        labels: (question.answers || [])
          .filter((answer) => answer.isCorrect)
          .map((answer) => String(answer.label || '').toUpperCase())
          .join(', '),
      })),
    [questions],
  )

  if (!chapterId) {
    return <Navigate to="/code/revision-chapitres" replace />
  }

  return (
    <section className="admin-panel questions-page">
      <AdminSectionHeader
        backTo={`/code/revision-chapitres?chapter=${chapterId}`}
        backLabel="Retour au chapitre"
        kicker="Banque figée"
        title={chapterName ? `Questions — ${chapterName}` : 'Questions'}
        subtitle="Les questions et audios sont fournis par fichiers. Pas d’upload ni de création ici."
      />

      <div className="questions-toolbar">
        <p className="questions-toolbar-meta">
          {hardcoded
            ? `${questions.length} question${questions.length > 1 ? 's' : ''} issues des fichiers (lecture seule).`
            : 'En attente des fichiers questions / audio pour ce chapitre.'}
        </p>
        <Link className="btn-secondary" to={`/code/revision-chapitres?chapter=${chapterId}&tab=sujet-test`}>
          <HelpCircle size={16} />
          Voir sujets test
        </Link>
      </div>

      {loading ? <p className="subtitle">Chargement…</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && awaitingFiles ? (
        <EmptyState
          title="Fichiers non reçus"
          description="Dès que les audios et la correction de ce chapitre seront intégrés au code, ils apparaîtront ici automatiquement."
        />
      ) : null}

      {!loading && !awaitingFiles && questions.length === 0 ? (
        <EmptyState title="Aucune question" description="Banque vide pour ce chapitre." />
      ) : null}

      <div className="questions-list">
        {questions.map((question, index) => {
          const expanded = expandedId === question.id
          const correct = correctSummary.find((item) => item.id === question.id)?.labels || '—'
          const audioUrl = resolveMediaUrl(question.prompt?.audioUrl)
          return (
            <article key={question.id} className={`question-card${expanded ? ' is-open' : ''}`}>
              <button
                type="button"
                className="question-card-head"
                onClick={() => setExpandedId(expanded ? null : question.id)}
              >
                <span className="question-card-index">Q{question.order || index + 1}</span>
                <span className="question-card-title">
                  {question.prompt?.text?.trim() || 'Énoncé audio'}
                </span>
                <span className="question-card-meta">
                  Bonne(s) réponse(s) : {correct || '—'}
                </span>
              </button>
              {expanded ? (
                <div className="question-card-body">
                  {audioUrl ? (
                    <div className="question-audio-row">
                      <Volume2 size={16} />
                      <audio controls preload="none" src={audioUrl}>
                        <track kind="captions" />
                      </audio>
                    </div>
                  ) : (
                    <p className="subtitle">Audio manquant</p>
                  )}
                  <ul className="question-answers-readonly">
                    {(question.answers || []).map((answer) => (
                      <li
                        key={answer.id || answer.label}
                        className={answer.isCorrect ? 'is-correct' : undefined}
                      >
                        <strong>{String(answer.label || '').toUpperCase()}</strong>
                        {answer.isCorrect ? <Check size={14} aria-label="Correcte" /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <p className="questions-back-link">
        <Link to={`/code/revision-chapitres?chapter=${chapterId}`}>
          <ChevronLeft size={16} />
          Retour aux cours du chapitre
        </Link>
      </p>
    </section>
  )
}
