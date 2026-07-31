import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  Image as ImageIcon,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { fetchChapterQuestions } from '../../api/questions'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { EmptyState } from '../../ui'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { ChapterQuestion } from '../../types/questions'

function correctLabels(question: ChapterQuestion) {
  return (question.answers || [])
    .filter((answer) => answer.isCorrect)
    .map((answer) => String(answer.label || '').toUpperCase())
    .filter(Boolean)
}

export function ChapterQuestionsPage() {
  const { chapterId = '' } = useParams()
  const [chapterName, setChapterName] = useState('')
  const [questions, setQuestions] = useState<ChapterQuestion[]>([])
  const [hardcoded, setHardcoded] = useState(false)
  const [awaitingFiles, setAwaitingFiles] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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

  const stats = useMemo(() => {
    let withAudio = 0
    let withImage = 0
    let multi = 0
    for (const question of questions) {
      if (question.prompt?.audioUrl) withAudio += 1
      if ((question.prompt?.imageUrls || []).length > 0) withImage += 1
      if (correctLabels(question).length > 1) multi += 1
    }
    return {
      total: questions.length,
      withAudio,
      withImage,
      multi,
      missingAudio: Math.max(0, questions.length - withAudio),
    }
  }, [questions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return questions
    return questions.filter((question, index) => {
      const order = String(question.order || index + 1)
      const text = question.prompt?.text?.trim() || ''
      const labels = correctLabels(question).join(' ')
      return (
        order.includes(q) ||
        `q${order}`.includes(q) ||
        text.toLowerCase().includes(q) ||
        labels.toLowerCase().includes(q)
      )
    })
  }, [questions, query])

  if (!chapterId) {
    return <Navigate to="/code/revision-chapitres" replace />
  }

  return (
    <section className="admin-panel questions-page questions-bank-page">
      <AdminSectionHeader
        backTo={`/code/revision-chapitres?chapter=${chapterId}`}
        backLabel="Retour au chapitre"
        kicker="Banque figée"
        kickerTone="success"
        title={chapterName ? `Questions — ${chapterName}` : 'Questions'}
        subtitle="Les questions et audios viennent des fichiers du chapitre. Consultation uniquement — pas d’upload ni de création ici."
      />

      {!loading && !awaitingFiles && questions.length > 0 ? (
        <div className="qb-stats" aria-label="Résumé de la banque">
          <div className="qb-stat">
            <strong>{stats.total}</strong>
            <span>Questions</span>
          </div>
          <div className="qb-stat">
            <strong>{stats.withAudio}</strong>
            <span>Avec audio</span>
          </div>
          <div className="qb-stat">
            <strong>{stats.multi}</strong>
            <span>Multi-réponses</span>
          </div>
          <div className={`qb-stat${stats.missingAudio > 0 ? ' is-warn' : ''}`}>
            <strong>{stats.missingAudio}</strong>
            <span>Audio manquant</span>
          </div>
          <Link
            className="qb-stat-action"
            to={`/code/revision-chapitres?chapter=${chapterId}&tab=sujet-test`}
          >
            <ClipboardList size={18} aria-hidden />
            Voir sujets test
          </Link>
        </div>
      ) : (
        <div className="questions-toolbar">
          <p className="questions-toolbar-meta">
            {hardcoded
              ? `${questions.length} question${questions.length > 1 ? 's' : ''} issues des fichiers (lecture seule).`
              : 'En attente des fichiers questions / audio pour ce chapitre.'}
          </p>
          <Link
            className="btn-secondary"
            to={`/code/revision-chapitres?chapter=${chapterId}&tab=sujet-test`}
          >
            <HelpCircle size={16} />
            Voir sujets test
          </Link>
        </div>
      )}

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

      {!loading && !awaitingFiles && questions.length > 0 ? (
        <>
          <div className="qb-toolbar">
            <label className="qb-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrer par n°, réponse (A, B…) ou texte…"
                aria-label="Filtrer les questions"
              />
            </label>
            <p className="qb-toolbar-count">
              {filtered.length === questions.length
                ? `${questions.length} question${questions.length > 1 ? 's' : ''} · lecture seule`
                : `${filtered.length} / ${questions.length} affichée${filtered.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun résultat"
              description="Aucune question ne correspond à ce filtre."
            />
          ) : (
            <div className="qb-table" role="list">
              <div className="qb-table-head" aria-hidden>
                <span>N°</span>
                <span>Énoncé</span>
                <span>Média</span>
                <span>Bonnes réponses</span>
                <span />
              </div>

              {filtered.map((question) => {
                const order =
                  question.order ||
                  questions.findIndex((item) => item.id === question.id) + 1 ||
                  1
                const expanded = expandedId === question.id
                const labels = correctLabels(question)
                const audioUrl = resolveMediaUrl(question.prompt?.audioUrl)
                const promptText = question.prompt?.text?.trim() || ''
                const images = (question.prompt?.imageUrls || [])
                  .map((url) => resolveMediaUrl(url))
                  .filter(Boolean) as string[]
                const hasAudio = Boolean(audioUrl)
                const answers = question.answers || []

                return (
                  <article
                    key={question.id}
                    className={`qb-row${expanded ? ' is-open' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="qb-row-main"
                      onClick={() => setExpandedId(expanded ? null : question.id)}
                      aria-expanded={expanded}
                    >
                      <span className="qb-index">Q{order}</span>
                      <span className="qb-prompt">
                        <strong>{promptText || 'Énoncé audio'}</strong>
                        {!promptText ? (
                          <small>Texte absent — écoutez l’audio pour l’énoncé</small>
                        ) : null}
                      </span>
                      <span className="qb-media">
                        {hasAudio ? (
                          <span className="qb-chip qb-chip-audio" title="Audio disponible">
                            <Volume2 size={14} aria-hidden />
                            Audio
                          </span>
                        ) : (
                          <span className="qb-chip qb-chip-muted" title="Audio manquant">
                            <VolumeX size={14} aria-hidden />
                            Sans audio
                          </span>
                        )}
                        {images.length > 0 ? (
                          <span className="qb-chip qb-chip-image" title="Image jointe">
                            <ImageIcon size={14} aria-hidden />
                            {images.length}
                          </span>
                        ) : null}
                      </span>
                      <span className="qb-answers">
                        {labels.length > 0 ? (
                          labels.map((label) => (
                            <span key={label} className="qb-answer-pill">
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="qb-answer-empty">—</span>
                        )}
                      </span>
                      <span className={`qb-chevron${expanded ? ' is-open' : ''}`}>
                        <ChevronDown size={18} aria-hidden />
                      </span>
                    </button>

                    {expanded ? (
                      <div className="qb-detail">
                        {promptText ? <p className="qb-detail-text">{promptText}</p> : null}

                        {hasAudio ? (
                          <div className="qb-audio">
                            <Volume2 size={16} aria-hidden />
                            <audio controls preload="none" src={audioUrl || undefined}>
                              <track kind="captions" />
                            </audio>
                          </div>
                        ) : (
                          <p className="qb-detail-warn">Audio manquant pour cette question.</p>
                        )}

                        {images.length > 0 ? (
                          <div className="qb-images">
                            {images.map((src) => (
                              <a key={src} href={src} target="_blank" rel="noreferrer">
                                <img src={src} alt="" />
                              </a>
                            ))}
                          </div>
                        ) : null}

                        <ul className="qb-detail-answers">
                          {answers.map((answer) => (
                            <li
                              key={answer.id || answer.label}
                              className={answer.isCorrect ? 'is-correct' : undefined}
                            >
                              <strong>{String(answer.label || '').toUpperCase()}</strong>
                              {answer.text?.trim() ? <span>{answer.text}</span> : null}
                              {answer.isCorrect ? (
                                <Check size={14} aria-label="Bonne réponse" />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
