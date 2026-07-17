import { FormEvent, useEffect, useRef, useState } from 'react'
import { Lock, MessageCircle, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AiTutorError, sendCourseTutorMessage, type AiChatMessage } from '../api/aiTutor'
import { fetchSubscriptionMe } from '../api/subscriptions'
import '../styles/ai-chat.css'

const WELCOME: AiChatMessage = {
  role: 'assistant',
  content:
    'Bonjour ! Pose-moi une question sur ce cours : je m’appuie uniquement sur son contenu pour t’expliquer.',
}

export function CourseAiChatPanel({
  chapterId,
  courseId,
  courseTitle,
  open,
  onClose,
}: {
  chapterId: string
  courseId: string
  courseTitle: string
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchSubscriptionMe()
      .then((access) => setAllowed(Boolean(access.accessAiChat)))
      .catch(() => setAllowed(false))
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!open) return null

  const handleSend = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return

    const nextMessages: AiChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setSending(true)
    setError(null)

    try {
      const history = nextMessages.filter((item, index) => !(index === 0 && item.role === 'assistant'))
      const data = await sendCourseTutorMessage({
        chapterId,
        courseId,
        messages: history,
      })
      setMessages([...nextMessages, data.message])
    } catch (err) {
      setError(err instanceof AiTutorError ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ai-chat-overlay" role="dialog" aria-modal="true" aria-label="Chat IA du cours">
      <div className="ai-chat-panel">
        <header className="ai-chat-header">
          <div>
            <p className="ai-chat-kicker">
              <MessageCircle size={16} /> Chat IA
            </p>
            <h2>{courseTitle}</h2>
          </div>
          <button type="button" className="ai-chat-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {allowed === null ? (
          <p className="ai-chat-status">Vérification de ton abonnement…</p>
        ) : !allowed ? (
          <div className="ai-chat-locked">
            <Lock size={28} />
            <h3>Chat IA réservé</h3>
            <p>
              Inclus dans certaines formules (ex. Pack complet). Souscris une offre qui inclut le chat
              IA tuteur.
            </p>
            <button type="button" className="btn-primary" onClick={() => navigate('/abonnement')}>
              Voir les offres
            </button>
          </div>
        ) : (
          <>
            <div className="ai-chat-messages">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`ai-chat-bubble ai-chat-bubble-${message.role}`}
                >
                  {message.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {error ? <p className="ai-chat-error">{error}</p> : null}
            <form className="ai-chat-composer" onSubmit={(event) => void handleSend(event)}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Pose ta question sur le cours…"
                rows={2}
                maxLength={1500}
                disabled={sending}
              />
              <button type="submit" disabled={!draft.trim() || sending} aria-label="Envoyer">
                {sending ? '…' : <Send size={18} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function CourseAiChatButton({
  chapterId,
  courseId,
  courseTitle,
}: {
  chapterId: string
  courseId: string
  courseTitle: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [accessAiChat, setAccessAiChat] = useState(false)

  useEffect(() => {
    void fetchSubscriptionMe()
      .then((access) => setAccessAiChat(Boolean(access.accessAiChat)))
      .catch(() => setAccessAiChat(false))
  }, [])

  return (
    <>
      <button
        type="button"
        className={`ai-chat-launch${accessAiChat ? '' : ' is-locked'}`}
        onClick={() => {
          if (accessAiChat) setOpen(true)
          else navigate('/abonnement')
        }}
      >
        {accessAiChat ? <MessageCircle size={18} /> : <Lock size={18} />}
        <span>
          <strong>{accessAiChat ? 'Discuter du cours avec l’IA' : 'Chat IA (formule Pack)'}</strong>
          <small>
            {accessAiChat
              ? 'Pose tes questions sur ce cours'
              : 'Inclus dans le Pack complet — voir les offres'}
          </small>
        </span>
      </button>
      <CourseAiChatPanel
        chapterId={chapterId}
        courseId={courseId}
        courseTitle={courseTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
