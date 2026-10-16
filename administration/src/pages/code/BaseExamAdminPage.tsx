import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Layers,
  RefreshCw,
  Shuffle,
  Trophy,
  X,
} from 'lucide-react'
import { CodeSection } from '../../components/model/CodeSection'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { SkeletonBlock } from '../../ui'
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

interface ChapterBankItem {
  chapterId: string
  chapterName: string
  questionCount: number
}

interface ExamOverview {
  bankCount: number
  chapterBank?: ChapterBankItem[]
  chapterCount?: number
  requiredSize: number
  examTotal: number
  passScore: number
  examCount: number
  ready: boolean
  stale?: boolean
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
        `${result.examCount} ${config.itemsLabel} généré(e)s (mélange aléatoire équilibré par chapitre, ${result.requiredSize} questions / ${config.itemLabel}).`,
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

  const generationHint = data
    ? data.ready
      ? `Les ${data.examTotal} ${config.itemsLabel} sont prêt(e)s (mélange équilibré sur tous les chapitres publiés). Régénérez pour re-mélanger.`
      : data.stale
        ? `La banque de questions a changé : régénérez pour mettre à jour les ${data.examTotal} ${config.itemsLabel}.`
        : `Il faut au moins ${data.requiredSize} questions publiées (chapitres publiés) pour générer les ${config.itemsLabel}.`
    : ''

  const bankFill = data && data.requiredSize > 0 ? Math.min(100, (data.bankCount / data.requiredSize) * 100) : 0
  const maxChapter = Math.max(1, ...(data?.chapterBank ?? []).map((c) => c.questionCount))

  return (
    <CodeSection
      kicker={config.kicker}
      title={config.title}
      subtitle="Sujets mélangés sur tous les chapitres publiés, générés à partir de la banque de questions."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {loading ? <SkeletonBlock rows={5} /> : null}

      {data ? (
        <>
          <div className="cx-kc-grid">
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-blue">
                <HelpCircle aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Questions publiées</span>
                <span className="cx-kc-value">
                  {data.bankCount} <small>/ {data.requiredSize} requises</small>
                </span>
                <span className="cx-kc-bar">
                  <i style={{ width: `${bankFill}%` }} />
                </span>
              </div>
            </div>
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-green">
                <Layers aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Chapitres dans le mix</span>
                <span className="cx-kc-value">{data.chapterCount ?? data.chapterBank?.length ?? 0}</span>
                <span className="cx-kc-sub">chapitres publiés</span>
              </div>
            </div>
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-sky">
                <ClipboardCheck aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">{config.itemsLabel} formés</span>
                <span className="cx-kc-value">
                  {data.examCount} <small>/ {data.examTotal}</small>
                </span>
                <span className="cx-kc-bar">
                  <i style={{ width: `${data.examTotal ? (data.examCount / data.examTotal) * 100 : 0}%` }} />
                </span>
              </div>
            </div>
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-gold">
                <Trophy aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Seuil de réussite</span>
                <span className="cx-kc-value">
                  {data.passScore} <small>/ 20</small>
                </span>
                <span className="cx-kc-sub">note minimale</span>
              </div>
            </div>
          </div>

          <section className="cx-panel">
            <div className="cx-toolbar">
              <p className="cx-toolbar-meta">{generationHint}</p>
              <button
                type="button"
                className="cx-btn cx-btn-fill"
                onClick={() => void handleGenerate()}
                disabled={generating || data.bankCount < data.requiredSize}
              >
                <Shuffle aria-hidden />
                {generating ? 'Mélange…' : `Mélanger & générer ${data.examTotal} ${config.itemsLabel}`}
              </button>
            </div>
          </section>

          <div className="cx-split" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <ClipboardCheck aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">{config.itemsLabel.charAt(0).toUpperCase() + config.itemsLabel.slice(1)}</h2>
                  <p className="cx-muted">Cliquez sur un {config.itemLabel.toLowerCase()} pour voir ses questions</p>
                </div>
              </div>
              {data.exams.length === 0 ? (
                <p className="cx-empty">Aucun(e) {config.itemLabel.toLowerCase()} généré(e) pour le moment.</p>
              ) : (
                <div className="cx-exam-grid">
                  {data.exams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      className={`cx-exam${exam.published ? '' : ' cx-draft'}`}
                      onClick={() => void handleViewDetail(exam.id)}
                      title={`Voir les questions de ${config.itemLabel} ${exam.examNumber}`}
                    >
                      <b>
                        {config.itemLabel} {exam.examNumber}
                      </b>
                      <span>{exam.questionCount} questions</span>
                      {!exam.published ? <span className="cx-chip cx-amber">Brouillon</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <Trophy aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Notes des apprenants</h2>
                  <p className="cx-muted">Résultats récents, en temps réel</p>
                </div>
              </div>
              {data.recentResults.length === 0 ? (
                <p className="cx-empty">Aucune note pour le moment.</p>
              ) : (
                <div className="cx-rows">
                  {data.recentResults.map((result) => (
                    <div key={result.id} className={`cx-row ${result.passed ? 'cx-pass' : 'cx-fail'}`}>
                      <div className="cx-row-main">
                        <strong>{result.learnerName}</strong>
                        <small>
                          {config.itemLabel} {result.examNumber}
                          {result.learnerEmail ? ` · ${result.learnerEmail}` : ''}
                        </small>
                      </div>
                      <span className="cx-score">{result.scoreLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {data.chapterBank && data.chapterBank.length > 0 ? (
            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <Layers aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Banque par chapitre</h2>
                  <p className="cx-muted">Source du mélange : questions publiées de chaque chapitre</p>
                </div>
              </div>
              <div className="cx-ct">
                {data.chapterBank.map((chapter) => (
                  <div className="cx-ct-row" key={chapter.chapterId}>
                    <div className="cx-ct-mid">
                      <div className="cx-ct-top">
                        <span>{chapter.chapterName}</span>
                        <em>{chapter.questionCount} Q</em>
                      </div>
                      <span className="cx-ct-bar">
                        <i
                          style={{
                            width: `${Math.max(3, (chapter.questionCount / maxChapter) * 100)}%`,
                            background: '#00b050',
                          }}
                        />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {detailExam ? (
        <div className="cx-modal-bg" onClick={() => setDetailExam(null)}>
          <div className="cx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="cx-modal-head">
              <h2>
                {config.itemLabel} {detailExam.examNumber}
              </h2>
              <span className="cx-chip cx-blue">{detailExam.questionCount} questions</span>
              <PublishSwitch
                checked={detailExam.published}
                onChange={(published) => void handlePublishToggle(detailExam.id, published)}
              />
              <button
                type="button"
                className="cx-btn cx-btn-icon"
                onClick={() => setDetailExam(null)}
                aria-label="Fermer"
              >
                <X aria-hidden />
              </button>
            </div>
            <div className="cx-modal-body">
              {detailLoading ? (
                <p className="cx-empty">Chargement des questions…</p>
              ) : (
                (detailExam.questions || []).map((question, index) => {
                  const expanded = expandedQuestionId === question.id
                  return (
                    <div key={question.id} className={`cx-qb-row${expanded ? ' cx-open' : ''}`}>
                      <button
                        type="button"
                        className="cx-qb-main"
                        style={{ gridTemplateColumns: '3.2rem minmax(0,1fr) auto 1.6rem' }}
                        onClick={() =>
                          setExpandedQuestionId((current) => (current === question.id ? null : question.id))
                        }
                        aria-expanded={expanded}
                      >
                        <span className="cx-qb-idx">Q{index + 1}</span>
                        <span className="cx-qb-prompt">
                          <strong>{question.prompt.text || 'Énoncé audio'}</strong>
                        </span>
                        <span className="cx-qb-media">
                          <span className="cx-chip">
                            {question.answers.length} réponse{question.answers.length !== 1 ? 's' : ''}
                          </span>
                          {!question.published ? <span className="cx-chip cx-amber">Brouillon</span> : null}
                        </span>
                        <span className={`cx-chev${expanded ? ' cx-open' : ''}`}>
                          {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="cx-qb-detail" style={{ paddingLeft: '1rem' }}>
                          {question.prompt.audioUrl ? (
                            <div className="cx-qb-audio">
                              <audio controls src={resolveMediaUrl(question.prompt.audioUrl)} />
                            </div>
                          ) : null}
                          {question.prompt.imageUrls.length > 0 ? (
                            <div className="cx-qb-imgs">
                              {question.prompt.imageUrls.map((url) => (
                                <img key={url} src={resolveMediaUrl(url)} alt="" />
                              ))}
                            </div>
                          ) : null}
                          <ul className="cx-ans-list">
                            {question.answers.map((answer) => (
                              <li
                                key={`${question.id}-${answer.label}`}
                                className={answer.isCorrect ? 'cx-correct' : undefined}
                              >
                                <strong>{answer.label.toUpperCase()}</strong>
                                {answer.text ? <span>{answer.text}</span> : null}
                                {answer.isCorrect ? <Check aria-label="Bonne réponse" /> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </CodeSection>
  )
}
