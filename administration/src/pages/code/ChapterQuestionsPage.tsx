import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  ImagePlus,
  Mic,
  Plus,
  Square,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react'
import {
  createQuestion,
  deleteQuestion,
  fetchChapterQuestions,
  updateQuestion,
  uploadRevisionAudio,
} from '../../api/questions'
import { uploadRevisionImage } from '../../api/revision'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { ChapterQuestion, QuestionAnswer, QuestionPrompt } from '../../types/questions'

const PAGE_SIZE = 50

type FormStep = 'Q' | 'A'

function emptyPrompt(): QuestionPrompt {
  return { text: '', audioUrl: '', imageUrls: [] }
}

function defaultAnswers(): QuestionAnswer[] {
  return ['a', 'b', 'c'].map((label) => ({
    label,
    text: '',
    audioUrl: '',
    isCorrect: false,
  }))
}

function nextAnswerLabel(answers: QuestionAnswer[]) {
  return String.fromCharCode(97 + answers.length)
}

function cloneAnswers(answers: QuestionAnswer[] = []): QuestionAnswer[] {
  return answers.map((answer) => ({
    label: answer.label,
    text: answer.text || '',
    audioUrl: '',
    isCorrect: answer.isCorrect,
  }))
}

async function uploadAudioFile(file: Blob, filename?: string) {
  const token = getAdminToken()
  if (!token) throw new Error('Session expirée. Reconnectez-vous.')
  return uploadRevisionAudio(token, file, filename)
}

export function ChapterQuestionsPage() {
  const { chapterId = '' } = useParams()
  const [chapterName, setChapterName] = useState('')
  const [questions, setQuestions] = useState<ChapterQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formStep, setFormStep] = useState<FormStep>('Q')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [recordingTarget, setRecordingTarget] = useState<'prompt' | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [prompt, setPrompt] = useState<QuestionPrompt>(emptyPrompt())
  const [answers, setAnswers] = useState<QuestionAnswer[]>(defaultAnswers())
  const recorderRef = useRef<MediaRecorder | null>(null)

  const publishedCount = useMemo(
    () => questions.filter((question) => question.published).length,
    [questions],
  )
  const draftCount = questions.length - publishedCount

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))
  const pageQuestions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return questions.slice(start, start + PAGE_SIZE)
  }, [questions, page])

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
      setPage(1)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  if (!chapterId) {
    return <Navigate to="/code/revision-chapitres" replace />
  }

  const resetForm = () => {
    setPrompt(emptyPrompt())
    setAnswers(defaultAnswers())
    setEditingId(null)
    setShowForm(false)
    setFormStep('Q')
  }

  const openCreateForm = () => {
    setPrompt(emptyPrompt())
    setAnswers(defaultAnswers())
    setEditingId(null)
    setFormStep('Q')
    setShowForm(true)
    setSuccess(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addAnswer = () => {
    setAnswers((current) => [
      ...current,
      {
        label: nextAnswerLabel(current),
        text: '',
        audioUrl: '',
        isCorrect: false,
      },
    ])
  }

  const removeAnswer = (index: number) => {
    setAnswers((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((answer, itemIndex) => ({
          ...answer,
          label: String.fromCharCode(97 + itemIndex),
        })),
    )
  }

  const openEditForm = (question: ChapterQuestion) => {
    setPrompt({
      text: question.prompt.text || '',
      audioUrl: question.prompt.audioUrl,
      imageUrls: [...question.prompt.imageUrls],
    })
    setAnswers(question.answers.length > 0 ? cloneAnswers(question.answers) : defaultAnswers())
    setEditingId(question.id)
    setFormStep('Q')
    setShowForm(true)
    setExpandedId(question.id)
    setSuccess(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePromptImage = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const { imageUrl } = await uploadRevisionImage(token, file)
      setPrompt((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, imageUrl],
      }))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import image impossible')
    } finally {
      setUploading(false)
    }
  }

  const handleAudioUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { audioUrl } = await uploadAudioFile(file, file.name)
      setPrompt((current) => ({ ...current, audioUrl }))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import audio impossible')
    } finally {
      setUploading(false)
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Enregistrement audio non supporté par ce navigateur')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setRecordingTarget(null)
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setUploading(true)
        try {
          const { audioUrl } = await uploadAudioFile(blob, 'recording.webm')
          setPrompt((current) => ({ ...current, audioUrl }))
        } catch (err) {
          setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
        } finally {
          setUploading(false)
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setRecordingTarget('prompt')
      setError(null)
    } catch {
      setError('Impossible d’accéder au microphone')
    }
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const goToAnswers = () => {
    if (!prompt.audioUrl.trim()) {
      setError('Enregistrez ou importez l’audio unique avant de continuer')
      return
    }
    setError(null)
    setFormStep('A')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!prompt.audioUrl.trim()) {
      setFormStep('Q')
      setError('Enregistrez ou importez l’audio unique (question + choix a, b, c)')
      return
    }
    if (answers.length < 1) {
      setFormStep('A')
      setError('Ajoutez au moins une réponse')
      return
    }
    if (!answers.some((answer) => answer.isCorrect)) {
      setFormStep('A')
      setError('Cochez au moins une bonne réponse')
      return
    }

    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    const payload = {
      prompt: {
        text: prompt.text.trim(),
        audioUrl: prompt.audioUrl,
        imageUrls: prompt.imageUrls,
      },
      answers: answers.map(({ label, isCorrect }) => ({
        label,
        text: '',
        audioUrl: '',
        isCorrect,
      })),
    }

    setSaving(true)
    try {
      if (editingId) {
        const { question } = await updateQuestion(token, chapterId, editingId, payload)
        setQuestions((current) =>
          current.map((item) => (item.id === question.id ? question : item)),
        )
        setSuccess('Question mise à jour.')
      } else {
        const { question } = await createQuestion(token, chapterId, payload)
        setQuestions((current) => [...current, question])
        setExpandedId(question.id)
        setPage(Math.ceil((questions.length + 1) / PAGE_SIZE))
        setSuccess('Question ajoutée.')
      }
      resetForm()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublished = async (question: ChapterQuestion, published: boolean) => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }
    setBusyId(question.id)
    try {
      const { question: updated } = await updateQuestion(token, chapterId, question.id, {
        published,
      })
      setQuestions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (question: ChapterQuestion) => {
    if (!window.confirm('Supprimer cette question ?')) return
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }
    setBusyId(question.id)
    try {
      await deleteQuestion(token, chapterId, question.id)
      setQuestions((current) => current.filter((item) => item.id !== question.id))
      if (expandedId === question.id) setExpandedId(null)
      setSuccess('Question supprimée.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  const pageOffset = (page - 1) * PAGE_SIZE
  const correctLabels = answers.filter((a) => a.isCorrect).map((a) => a.label.toUpperCase())

  return (
    <div className="questions-page">
      <AdminSectionHeader
        backTo={`/code/revision-chapitres?chapter=${encodeURIComponent(chapterId)}`}
        backLabel="Retour au chapitre"
        kicker="Banque de questions"
        title={chapterName ? chapterName : 'Questions du chapitre'}
        subtitle="Un audio (question + a/b/c) · cochez la bonne réponse · l’apprenant écoute deux fois"
      />

      {success ? (
        <p className="qp-toast qp-toast-ok" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="qp-toast qp-toast-err" role="alert">
          {error}
        </p>
      ) : null}

      <div className="qp-stats">
        <article className="qp-stat">
          <span className="qp-stat-value">{loading ? '—' : questions.length}</span>
          <span className="qp-stat-label">Total</span>
        </article>
        <article className="qp-stat qp-stat-live">
          <span className="qp-stat-value">{loading ? '—' : publishedCount}</span>
          <span className="qp-stat-label">Publiées</span>
        </article>
        <article className="qp-stat qp-stat-draft">
          <span className="qp-stat-value">{loading ? '—' : draftCount}</span>
          <span className="qp-stat-label">Brouillons</span>
        </article>
        <div className="qp-stat-actions">
          {!showForm ? (
            <button type="button" className="btn-primary btn-primary-inline" onClick={openCreateForm}>
              <Plus size={16} />
              Nouvelle question
            </button>
          ) : null}
          <Link
            to={`/code/revision-chapitres?chapter=${encodeURIComponent(chapterId)}&tab=sujet-test`}
            className="btn-outline"
          >
            <ClipboardList size={15} />
            Sujet test
          </Link>
        </div>
      </div>

      {showForm ? (
        <form className="qp-composer" onSubmit={handleSubmit}>
          <div className="qp-composer-top">
            <div>
              <span className="qp-mode">{editingId ? 'Édition' : 'Création'}</span>
              <h3>{editingId ? 'Modifier la question' : 'Nouvelle question'}</h3>
            </div>
            <button type="button" className="btn-icon-muted" onClick={resetForm} aria-label="Fermer">
              <X size={16} />
            </button>
          </div>

          <ol className="qp-steps" aria-label="Étapes">
            <li className={formStep === 'Q' ? 'is-active' : 'is-done'}>
              <button type="button" onClick={() => setFormStep('Q')}>
                <span className="qp-step-num">1</span>
                <span className="qp-step-copy">
                  <strong>Audio</strong>
                  <small>Question + choix</small>
                </span>
              </button>
            </li>
            <li className={formStep === 'A' ? 'is-active' : ''}>
              <button type="button" onClick={() => void goToAnswers()}>
                <span className="qp-step-num">2</span>
                <span className="qp-step-copy">
                  <strong>Réponses</strong>
                  <small>Cocher A / B / C</small>
                </span>
              </button>
            </li>
          </ol>

          {formStep === 'Q' ? (
            <div className="qp-panel">
              <div className={`qp-audio-hero${prompt.audioUrl ? ' has-audio' : ''}${recordingTarget ? ' is-recording' : ''}`}>
                <div className="qp-audio-hero-icon">
                  {recordingTarget ? <Mic size={28} /> : <Volume2 size={28} />}
                </div>
                <div className="qp-audio-hero-copy">
                  <h4>{recordingTarget ? 'Enregistrement en cours…' : 'Audio unique'}</h4>
                  <p>
                    Énoncez la question puis les choix a, b et c dans le même fichier. L’apprenant
                    l’entendra deux fois.
                  </p>
                </div>
                <div className="qp-audio-hero-actions">
                  <label className="btn-outline btn-file">
                    <Upload size={15} />
                    Importer
                    <input
                      type="file"
                      accept="audio/*"
                      hidden
                      onChange={(e) => void handleAudioUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {recordingTarget === 'prompt' ? (
                    <button type="button" className="btn-outline btn-recording" onClick={stopRecording}>
                      <Square size={15} />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-primary-inline"
                      onClick={() => void startRecording()}
                      disabled={uploading}
                    >
                      <Mic size={15} />
                      Enregistrer
                    </button>
                  )}
                </div>
                {prompt.audioUrl ? (
                  <div className="qp-audio-ready">
                    <audio controls src={resolveMediaUrl(prompt.audioUrl)} />
                    <button
                      type="button"
                      className="btn-text-danger"
                      onClick={() => setPrompt((current) => ({ ...current, audioUrl: '' }))}
                    >
                      Retirer l’audio
                    </button>
                  </div>
                ) : (
                  <p className="qp-audio-missing">Audio obligatoire pour continuer</p>
                )}
              </div>

              <details className="qp-optional">
                <summary>Texte et images (optionnel)</summary>
                <label className="question-text-field">
                  <span className="question-media-label">Texte</span>
                  <textarea
                    value={prompt.text}
                    onChange={(e) => setPrompt((current) => ({ ...current, text: e.target.value }))}
                    placeholder="Note écrite visible pour l’apprenant (optionnel)…"
                    rows={3}
                  />
                </label>
                <div className="question-media-block question-media-images">
                  <span className="question-media-label">Images</span>
                  <label className="btn-outline btn-file">
                    <ImagePlus size={15} />
                    Ajouter une image
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void handlePromptImage(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {prompt.imageUrls.length > 0 ? (
                    <div className="question-images">
                      {prompt.imageUrls.map((url) => (
                        <div key={url} className="question-image-item">
                          <img src={resolveMediaUrl(url)} alt="" />
                          <button
                            type="button"
                            className="btn-icon-danger"
                            onClick={() =>
                              setPrompt((current) => ({
                                ...current,
                                imageUrls: current.imageUrls.filter((item) => item !== url),
                              }))
                            }
                            aria-label="Retirer l’image"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="question-media-empty">Aucune image</p>
                  )}
                </div>
              </details>

              <div className="qp-footer">
                <button type="button" className="btn-outline" onClick={resetForm}>
                  Annuler
                </button>
                <button type="button" className="btn-primary btn-primary-inline" onClick={goToAnswers}>
                  Continuer
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="qp-panel">
              <div className="qp-answer-intro">
                <p>
                  Cochez la ou les bonnes réponses. Les choix sont déjà dans l’audio.
                  {correctLabels.length > 0 ? (
                    <>
                      {' '}
                      Sélection : <strong>{correctLabels.join(', ')}</strong>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="qp-answer-grid">
                {answers.map((answer, index) => (
                  <div
                    key={`${answer.label}-${index}`}
                    className={`qp-answer-tile${answer.isCorrect ? ' is-correct' : ''}`}
                  >
                    <button
                      type="button"
                      className="qp-answer-main"
                      onClick={() =>
                        setAnswers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, isCorrect: !item.isCorrect }
                              : item,
                          ),
                        )
                      }
                    >
                      <span className="qp-answer-letter">{answer.label.toUpperCase()}</span>
                      <span className="qp-answer-meta">
                        <strong>{answer.isCorrect ? 'Bonne réponse' : 'Marquer comme bonne'}</strong>
                        <small>Choix {answer.label.toUpperCase()}</small>
                      </span>
                      <span className={`qp-answer-check${answer.isCorrect ? ' on' : ''}`}>
                        {answer.isCorrect ? <Check size={18} /> : null}
                      </span>
                    </button>
                    {answers.length > 1 ? (
                      <button
                        type="button"
                        className="qp-answer-remove"
                        onClick={() => removeAnswer(index)}
                        aria-label={`Retirer le choix ${answer.label.toUpperCase()}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button type="button" className="btn-add-answer" onClick={addAnswer}>
                <Plus size={16} />
                Ajouter un choix
              </button>

              <div className="qp-footer">
                <button type="button" className="btn-outline" onClick={() => setFormStep('Q')}>
                  <ChevronLeft size={16} />
                  Retour
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-primary-inline"
                  disabled={saving || uploading}
                >
                  {saving
                    ? 'Enregistrement…'
                    : editingId
                      ? 'Mettre à jour'
                      : 'Enregistrer la question'}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : null}

      <section className="qp-bank">
        <div className="qp-bank-head">
          <h3>Questions du chapitre</h3>
          <p>
            {loading
              ? 'Chargement…'
              : `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <p className="qp-loading">Chargement des questions…</p>
        ) : questions.length === 0 ? (
          <div className="qp-empty">
            <div className="qp-empty-icon">
              <HelpCircle size={28} />
            </div>
            <p className="qp-empty-title">Aucune question</p>
            <p className="qp-empty-text">
              Créez la première : un audio (question + a/b/c), puis cochez la bonne réponse.
            </p>
            <button type="button" className="btn-primary btn-primary-inline" onClick={openCreateForm}>
              <Plus size={16} />
              Créer une question
            </button>
          </div>
        ) : (
          <div className="qp-list">
            {pageQuestions.map((question, index) => {
              const displayIndex = pageOffset + index + 1
              const expanded = expandedId === question.id
              const correct = question.answers.filter((a) => a.isCorrect).map((a) => a.label.toUpperCase())
              return (
                <article
                  key={question.id}
                  className={`qp-card${expanded ? ' is-open' : ''}${question.published ? '' : ' is-draft'}`}
                >
                  <div className="qp-card-row">
                    <button
                      type="button"
                      className="qp-card-toggle"
                      onClick={() =>
                        setExpandedId((current) => (current === question.id ? null : question.id))
                      }
                    >
                      <span className="qp-card-index">{displayIndex}</span>
                      <span className="qp-card-body">
                        <strong>Question {displayIndex}</strong>
                        <small>
                          {question.prompt.audioUrl ? 'Audio prêt' : 'Sans audio'}
                          {' · '}
                          {correct.length > 0 ? `Bonne(s) : ${correct.join(', ')}` : 'Aucune bonne réponse'}
                        </small>
                      </span>
                      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="qp-card-actions">
                      {!question.published ? <span className="qp-draft-tag">Brouillon</span> : null}
                      <PublishSwitch
                        checked={question.published}
                        onChange={(published) => void handleTogglePublished(question, published)}
                        disabled={busyId === question.id}
                      />
                      <button
                        type="button"
                        className="btn-text-danger"
                        disabled={busyId === question.id}
                        onClick={() => void handleDelete(question)}
                        aria-label={`Supprimer la question ${displayIndex}`}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="qp-card-detail">
                      {question.prompt.text ? (
                        <p className="question-prompt-text">{question.prompt.text}</p>
                      ) : null}
                      {question.prompt.audioUrl ? (
                        <audio controls src={resolveMediaUrl(question.prompt.audioUrl)} />
                      ) : null}
                      {question.prompt.imageUrls.length > 0 ? (
                        <div className="question-images">
                          {question.prompt.imageUrls.map((url) => (
                            <img
                              key={url}
                              src={resolveMediaUrl(url)}
                              alt=""
                              className="question-preview-image"
                            />
                          ))}
                        </div>
                      ) : null}
                      <div className="qp-correct-pills">
                        {question.answers.map((answer) => (
                          <span
                            key={`${question.id}-${answer.id ?? answer.label}`}
                            className={`qp-pill${answer.isCorrect ? ' is-correct' : ''}`}
                          >
                            {answer.label.toUpperCase()}
                            {answer.isCorrect ? <Check size={12} /> : null}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn-outline-sm"
                        onClick={() => openEditForm(question)}
                      >
                        Modifier
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        {!loading && questions.length > PAGE_SIZE ? (
          <div className="questions-pagination">
            <button
              type="button"
              className="btn-outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={16} />
              Précédent
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-outline"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
