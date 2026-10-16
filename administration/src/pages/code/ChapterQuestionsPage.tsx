import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { fetchChapterQuestions } from '../../api/questions'
import { CodeSection } from '../../components/model/CodeSection'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'
import { resolveMediaUrl } from '../../utils/mediaUrl'
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
    let multi = 0
    for (const question of questions) {
      if (question.prompt?.audioUrl) withAudio += 1
      if (correctLabels(question).length > 1) multi += 1
    }
    return {
      total: questions.length,
      withAudio,
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

  if (!chapterId) return <Navigate to="/code/revision-chapitres" replace />

  const ready = !loading && !awaitingFiles && questions.length > 0

  return (
    <CodeSection
      kicker="Banque figée"
      title={chapterName ? `Questions · ${chapterName}` : 'Questions'}
      subtitle="Les questions et audios viennent des fichiers du chapitre. Consultation uniquement : pas d’upload ni de création ici."
      actions={
        <>
          <Link to={`/code/revision-chapitres?chapter=${chapterId}`} className="cx-refresh">
            <ArrowLeft aria-hidden />
            Retour au chapitre
          </Link>
          <Link to={`/code/revision-chapitres?chapter=${chapterId}`} className="cx-refresh">
            <ClipboardList aria-hidden />
            Sujets test
          </Link>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {loading ? <SkeletonBlock rows={6} /> : null}

      {ready ? (
        <div className="cx-kc-grid">
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-blue">
              <HelpCircle aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Questions</span>
              <span className="cx-kc-value">{stats.total}</span>
              <span className="cx-kc-sub">dans ce chapitre</span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-green">
              <Volume2 aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Avec audio</span>
              <span className="cx-kc-value">{stats.withAudio}</span>
              <span className="cx-kc-bar">
                <i style={{ width: `${stats.total ? (stats.withAudio / stats.total) * 100 : 0}%` }} />
              </span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-sky">
              <Layers aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Multi-réponses</span>
              <span className="cx-kc-value">{stats.multi}</span>
              <span className="cx-kc-sub">plusieurs bonnes réponses</span>
            </div>
          </div>
          <div className="cx-kc">
            <span className="cx-kc-ico cx-kc-gold">
              <VolumeX aria-hidden />
            </span>
            <div className="cx-kc-body">
              <span className="cx-kc-label">Audio manquant</span>
              <span className="cx-kc-value">{stats.missingAudio}</span>
              <span className="cx-kc-sub">{stats.missingAudio > 0 ? 'à compléter' : 'rien à signaler'}</span>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !awaitingFiles && questions.length === 0 && !error ? (
        <EmptyState title="Aucune question" description="Banque vide pour ce chapitre." />
      ) : null}

      {!loading && awaitingFiles ? (
        <EmptyState
          title="Fichiers non reçus"
          description="Dès que les audios et la correction de ce chapitre seront intégrés au code, ils apparaîtront ici automatiquement."
        />
      ) : null}

      {ready ? (
        <section className="cx-panel">
          <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
            <label className="cx-search">
              <Search aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrer par n°, réponse (A, B…) ou texte…"
                aria-label="Filtrer les questions"
              />
            </label>
            <p className="cx-toolbar-meta" style={{ flex: 'none', minWidth: 0 }}>
              {filtered.length === questions.length
                ? `${questions.length} question${questions.length > 1 ? 's' : ''} · lecture seule`
                : `${filtered.length} / ${questions.length} affichée${filtered.length > 1 ? 's' : ''}`}
              {hardcoded ? '' : ''}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Aucun résultat" description="Aucune question ne correspond à ce filtre." />
          ) : (
            <div className="cx-qb" role="list">
              <div className="cx-qb-head" aria-hidden>
                <span>N°</span>
                <span>Énoncé</span>
                <span>Média</span>
                <span>Bonnes réponses</span>
                <span />
              </div>

              {filtered.map((question) => {
                const order =
                  question.order || questions.findIndex((item) => item.id === question.id) + 1 || 1
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
                    className={`cx-qb-row${expanded ? ' cx-open' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="cx-qb-main"
                      onClick={() => setExpandedId(expanded ? null : question.id)}
                      aria-expanded={expanded}
                    >
                      <span className="cx-qb-idx">Q{order}</span>
                      <span className="cx-qb-prompt">
                        <strong>{promptText || 'Énoncé audio'}</strong>
                        {!promptText ? <small>Texte absent : écoutez l’audio pour l’énoncé</small> : null}
                      </span>
                      <span className="cx-qb-media">
                        {hasAudio ? (
                          <span className="cx-chip cx-green" title="Audio disponible">
                            <Volume2 size={13} aria-hidden />
                            Audio
                          </span>
                        ) : (
                          <span className="cx-chip cx-amber" title="Audio manquant">
                            <VolumeX size={13} aria-hidden />
                            Sans audio
                          </span>
                        )}
                        {images.length > 0 ? (
                          <span className="cx-chip cx-blue" title="Image jointe">
                            <ImageIcon size={13} aria-hidden />
                            {images.length}
                          </span>
                        ) : null}
                      </span>
                      <span className="cx-qb-ans">
                        {labels.length > 0 ? (
                          labels.map((label) => (
                            <span key={label} className="cx-pill-ans">
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="cx-muted">—</span>
                        )}
                      </span>
                      <span className={`cx-chev${expanded ? ' cx-open' : ''}`}>
                        <ChevronDown aria-hidden />
                      </span>
                    </button>

                    {expanded ? (
                      <div className="cx-qb-detail">
                        {promptText ? <p className="cx-qb-text">{promptText}</p> : null}

                        {hasAudio ? (
                          <div className="cx-qb-audio">
                            <Volume2 size={16} aria-hidden />
                            <audio controls preload="none" src={audioUrl || undefined}>
                              <track kind="captions" />
                            </audio>
                          </div>
                        ) : (
                          <p className="cx-warn">Audio manquant pour cette question.</p>
                        )}

                        {images.length > 0 ? (
                          <div className="cx-qb-imgs">
                            {images.map((src) => (
                              <a key={src} href={src} target="_blank" rel="noreferrer">
                                <img src={src} alt="" />
                              </a>
                            ))}
                          </div>
                        ) : null}

                        <ul className="cx-ans-list">
                          {answers.map((answer) => (
                            <li
                              key={answer.id || answer.label}
                              className={answer.isCorrect ? 'cx-correct' : undefined}
                            >
                              <strong>{String(answer.label || '').toUpperCase()}</strong>
                              {answer.text?.trim() ? <span>{answer.text}</span> : null}
                              {answer.isCorrect ? <Check aria-label="Bonne réponse" /> : null}
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
        </section>
      ) : null}
    </CodeSection>
  )
}
