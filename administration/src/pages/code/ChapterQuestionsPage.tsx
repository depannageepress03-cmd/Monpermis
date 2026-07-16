import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ImagePlus,
  Mic,
  Plus,
  Square,
  Trash2,
  Upload,
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
    text: '',
    audioUrl: answer.audioUrl,
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
  const [recordingTarget, setRecordingTarget] = useState<'prompt' | number | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [prompt, setPrompt] = useState<QuestionPrompt>(emptyPrompt())
  const [answers, setAnswers] = useState<QuestionAnswer[]>(defaultAnswers())
  const recorderRef = useRef<MediaRecorder | null>(null)

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
          text: '',
        })),
    )
  }

  const openEditForm = (question: ChapterQuestion) => {
    setPrompt({
      text: question.prompt.text || '',
      audioUrl: question.prompt.audioUrl,
      imageUrls: [...question.prompt.imageUrls],
    })
    setAnswers(
      question.answers.length > 0 ? cloneAnswers(question.answers) : defaultAnswers(),
    )
    setEditingId(question.id)
    setFormStep('Q')
    setShowForm(true)
    setExpandedId(question.id)
    setSuccess(null)
    setError(null)
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

  const handleAudioUpload = async (target: 'prompt' | number, file: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { audioUrl } = await uploadAudioFile(file, file.name)
      if (target === 'prompt') {
        setPrompt((current) => ({ ...current, audioUrl }))
      } else {
        setAnswers((current) =>
          current.map((answer, index) =>
            index === target ? { ...answer, audioUrl } : answer,
          ),
        )
      }
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import audio impossible')
    } finally {
      setUploading(false)
    }
  }

  const startRecording = async (target: 'prompt' | number) => {
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
          if (target === 'prompt') {
            setPrompt((current) => ({ ...current, audioUrl }))
          } else {
            setAnswers((current) =>
              current.map((answer, index) =>
                index === target ? { ...answer, audioUrl } : answer,
              ),
            )
          }
        } catch (err) {
          setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
        } finally {
          setUploading(false)
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setRecordingTarget(target)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const hasPromptContent =
      Boolean(prompt.text.trim()) || Boolean(prompt.audioUrl) || prompt.imageUrls.length > 0
    if (!hasPromptContent) {
      setFormStep('Q')
      setError('Ajoutez au moins un texte, un audio ou une image à la question')
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
    if (answers.some((answer) => !answer.audioUrl)) {
      setFormStep('A')
      setError('Chaque réponse doit avoir un audio')
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
      answers: answers.map(({ label, audioUrl, isCorrect }) => ({
        label,
        text: '',
        audioUrl,
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

  return (
    <div className="questions-page">
      <AdminSectionHeader
        backTo={`/code/revision-chapitres?chapter=${encodeURIComponent(chapterId)}`}
        backLabel="Retour au chapitre"
        kicker="Banque de questions"
        title={chapterName ? `Questions — ${chapterName}` : 'Questions du chapitre'}
        subtitle={`${questions.length} question${questions.length !== 1 ? 's' : ''} · texte, audio et images libres · réponses a / b / c`}
      />

      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <div className="questions-toolbar">
        <p className="questions-toolbar-meta">
          {loading
            ? 'Chargement…'
            : `${questions.length} question${questions.length !== 1 ? 's' : ''} dans ce chapitre`}
        </p>
        {!showForm ? (
          <button type="button" className="btn-primary btn-primary-inline" onClick={openCreateForm}>
            <Plus size={16} />
            Ajouter une question
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form className="question-form" onSubmit={handleSubmit}>
          <div className="question-form-header">
            <div>
              <span className="questions-badge">{editingId ? 'Édition' : 'Création'}</span>
              <h3>{editingId ? 'Modifier la question' : 'Nouvelle question'}</h3>
            </div>
            <button type="button" className="btn-icon-muted" onClick={resetForm} aria-label="Fermer">
              <X size={16} />
            </button>
          </div>

          <div className="question-step-switch" role="tablist" aria-label="Étape du formulaire">
            <button
              type="button"
              role="tab"
              aria-selected={formStep === 'Q'}
              className={`question-step-btn${formStep === 'Q' ? ' active' : ''}`}
              onClick={() => setFormStep('Q')}
            >
              Q — Question
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={formStep === 'A'}
              className={`question-step-btn${formStep === 'A' ? ' active' : ''}`}
              onClick={() => setFormStep('A')}
            >
              A — Réponses
            </button>
          </div>

          {formStep === 'Q' ? (
            <fieldset className="question-section question-section-q">
              <legend>Question (Q)</legend>
              <p className="question-hint">
                Ajoutez librement du texte, un audio et/ou des images — rien n’est obligatoire
                individuellement, mais au moins un élément est requis pour enregistrer.
              </p>

              <label className="question-text-field">
                <span className="question-media-label">Texte</span>
                <textarea
                  value={prompt.text}
                  onChange={(e) => setPrompt((current) => ({ ...current, text: e.target.value }))}
                  placeholder="Énoncez la question (optionnel si audio ou image)…"
                  rows={4}
                />
              </label>

              <div className="question-media-row">
                <div className="question-media-block question-media-audio">
                  <span className="question-media-label">Audio</span>
                  <div className="question-media-actions">
                    <label className="btn-outline btn-file">
                      <Upload size={15} />
                      Importer
                      <input
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) =>
                          void handleAudioUpload('prompt', e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {recordingTarget === 'prompt' ? (
                      <button
                        type="button"
                        className="btn-outline btn-recording"
                        onClick={stopRecording}
                      >
                        <Square size={15} />
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => void startRecording('prompt')}
                        disabled={uploading}
                      >
                        <Mic size={15} />
                        Enregistrer
                      </button>
                    )}
                  </div>
                  {prompt.audioUrl ? (
                    <div className="question-audio-preview">
                      <audio controls src={resolveMediaUrl(prompt.audioUrl)} />
                      <button
                        type="button"
                        className="btn-text-danger"
                        onClick={() => setPrompt((current) => ({ ...current, audioUrl: '' }))}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <p className="question-media-empty">Aucun audio</p>
                  )}
                </div>

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
              </div>

              <div className="question-form-actions">
                <button type="button" className="btn-outline" onClick={resetForm}>
                  Annuler
                </button>
                <button type="button" className="btn-primary btn-primary-inline" onClick={() => setFormStep('A')}>
                  Continuer vers A
                  <ChevronRight size={16} />
                </button>
              </div>
            </fieldset>
          ) : (
            <fieldset className="question-section question-section-a">
              <legend>Réponses (A)</legend>
              <p className="question-hint">
                Les choix a, b et c sont prêts. Ajoutez l’audio de chaque réponse, cochez la ou les
                bonnes réponses, puis enregistrez.
              </p>

              <div className="answer-list">
                {answers.map((answer, index) => (
                  <div
                    key={`${answer.label}-${index}`}
                    className={`answer-card${answer.isCorrect ? ' is-correct' : ''}`}
                  >
                    <div className="answer-card-top">
                      <div className="answer-identity">
                        <label className="answer-correct">
                          <input
                            type="checkbox"
                            checked={answer.isCorrect}
                            onChange={(e) =>
                              setAnswers((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, isCorrect: e.target.checked }
                                    : item,
                                ),
                              )
                            }
                          />
                          <span className="answer-chip">{answer.label.toUpperCase()}</span>
                          <span>Bonne réponse</span>
                        </label>
                      </div>
                      {answers.length > 1 ? (
                        <button
                          type="button"
                          className="btn-text-danger"
                          onClick={() => removeAnswer(index)}
                        >
                          <Trash2 size={15} />
                          Retirer
                        </button>
                      ) : null}
                    </div>

                    <div className="question-media-actions">
                      <label className="btn-outline btn-file">
                        <Upload size={15} />
                        Importer audio
                        <input
                          type="file"
                          accept="audio/*"
                          hidden
                          onChange={(e) =>
                            void handleAudioUpload(index, e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      {recordingTarget === index ? (
                        <button
                          type="button"
                          className="btn-outline btn-recording"
                          onClick={stopRecording}
                        >
                          <Square size={15} />
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => void startRecording(index)}
                          disabled={uploading}
                        >
                          <Mic size={15} />
                          Enregistrer
                        </button>
                      )}
                    </div>

                    {answer.audioUrl ? (
                      <div className="question-audio-preview">
                        <audio controls src={resolveMediaUrl(answer.audioUrl)} />
                        <button
                          type="button"
                          className="btn-text-danger"
                          onClick={() =>
                            setAnswers((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, audioUrl: '' } : item,
                              ),
                            )
                          }
                        >
                          Retirer l’audio
                        </button>
                      </div>
                    ) : (
                      <p className="question-media-empty">Aucun audio pour cette réponse</p>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" className="btn-add-answer" onClick={addAnswer}>
                <Plus size={16} />
                Ajouter une réponse
              </button>

              <div className="question-form-actions">
                <button type="button" className="btn-outline" onClick={() => setFormStep('Q')}>
                  <ChevronLeft size={16} />
                  Retour à Q
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-primary-inline"
                  disabled={saving || uploading}
                >
                  {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Enregistrer la question'}
                </button>
              </div>
            </fieldset>
          )}
        </form>
      ) : null}

      <div className="revision-courses-stack questions-list">
        {loading ? (
          <p className="revision-empty">Chargement des questions…</p>
        ) : questions.length === 0 ? (
          <div className="questions-empty">
            <p className="questions-empty-title">Aucune question dans ce chapitre</p>
            <p className="questions-empty-text">
              Cliquez sur « Ajouter une question » pour créer la première (Q puis A).
            </p>
          </div>
        ) : (
          pageQuestions.map((question, index) => {
            const displayIndex = pageOffset + index + 1
            const expanded = expandedId === question.id
            return (
              <div key={question.id} className="revision-course question-list-card">
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
                    <span>Question {displayIndex}</span>
                    <span className="revision-count">
                      {question.answers.length} réponse
                      {question.answers.length !== 1 ? 's' : ''}
                    </span>
                    {!question.published ? <span className="revision-tag">Brouillon</span> : null}
                  </button>
                  <div className="revision-item-actions">
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
                      Supprimer
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="revision-course-body">
                    {question.prompt.text ? (
                      <p className="question-prompt-text">{question.prompt.text}</p>
                    ) : null}
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
                        <li key={`${question.id}-${answer.id ?? answer.label}`}>
                          <span className={answer.isCorrect ? 'is-correct' : undefined}>
                            {answer.label.toUpperCase()}. Audio
                            {answer.isCorrect ? ' ✓' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="revision-actions revision-actions-footer">
                      <button
                        type="button"
                        className="btn-outline-sm"
                        onClick={() => openEditForm(question)}
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

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

      {!showForm && questions.length > 0 ? (
        <div className="revision-inline-form revision-add-course">
          <button type="button" className="btn-primary btn-primary-inline" onClick={openCreateForm}>
            <Plus size={16} />
            Ajouter une question
          </button>
          <Link
            to={`/code/revision-chapitres?chapter=${encodeURIComponent(chapterId)}&tab=sujet-test`}
            className="btn-outline"
          >
            Voir le sujet test
          </Link>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
