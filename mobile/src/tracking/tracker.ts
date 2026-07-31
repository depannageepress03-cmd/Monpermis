import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { AppState, type AppStateStatus, Platform } from 'react-native'
import { getApiBase } from '../api/config'
import { getStoredToken } from '../api/session'

/**
 * Traqueur des faits et gestes de l'apprenant sur l'APK.
 * - Buffer mémoire + AsyncStorage (survit kill / offline)
 * - Flush batch toutes les 20 s / au premier plan / au seuil
 * - Fire-and-forget : n'interrompt jamais l'UI
 */

export type TrackEventName =
  | 'app_open'
  | 'app_background'
  | 'app_foreground'
  | 'screen_view'
  | 'exam_start'
  | 'exam_answer'
  | 'exam_skip'
  | 'exam_quit'
  | 'exam_complete'
  | 'exam_pause'
  | 'exam_resume'
  | 'test_start'
  | 'test_answer'
  | 'test_skip'
  | 'test_complete'
  | 'practice_start'
  | 'practice_answer'
  | 'practice_skip'
  | 'practice_complete'

export interface TrackContext {
  examNumber?: number
  examId?: string
  attemptId?: string
  examType?: 'practice'
  questionId?: string
  chapterId?: string
  subjectNumber?: number
  mode?: 'test' | 'practice'
  screen?: string
  [key: string]: unknown
}

export interface TrackPayload {
  elapsedMs?: number
  [key: string]: unknown
}

export interface TrackEvent {
  event: TrackEventName
  sessionId: string
  context?: TrackContext | null
  payload?: TrackPayload | null
  clientTs: string
  appVersion: string
  platform: string
}

const STORAGE_KEY = '@monpermis/learner_track_buffer_v1'
const FLUSH_INTERVAL_MS = 20_000
const FLUSH_THRESHOLD = 40
const MAX_BUFFER = 200

function randomSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function appVersion() {
  return (
    Constants.expoConfig?.version ||
    Constants.nativeApplicationVersion ||
    'unknown'
  )
}

class Tracker {
  private buffer: TrackEvent[] = []
  private flushing = false
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private interval: ReturnType<typeof setInterval> | null = null
  private started = false
  private hydrated = false
  /** Contexte d’examen / quiz en cours — pour pause / reprise auto. */
  private activeContext: TrackContext | null = null
  private questionStartedAt: number | null = null
  private examPaused = false
  readonly sessionId = randomSessionId()

  start() {
    if (this.started) return
    this.started = true
    void this.hydrate()
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (this.activeContext && !this.examPaused) {
          this.examPaused = true
          this.track('exam_pause', this.activeContext, {
            elapsedMs: this.peekElapsedMs(),
          })
        }
        this.track('app_background')
        void this.flush()
      } else if (state === 'active') {
        this.track('app_foreground')
        if (this.activeContext && this.examPaused) {
          this.examPaused = false
          this.track('exam_resume', this.activeContext, { from: 'app_foreground' })
          this.markQuestionStart()
        }
        void this.flush()
      }
    })
    this.interval = setInterval(() => {
      void this.flush()
    }, FLUSH_INTERVAL_MS)
    this.track('app_open')
  }

  /** Déclare qu’un examen / sujet est en cours (pause auto au background). */
  setActiveSession(context: TrackContext | null) {
    this.activeContext = context
    this.examPaused = false
    if (context) this.markQuestionStart()
    else this.questionStartedAt = null
  }

  /** Début d’affichage d’une question (pour elapsedMs). */
  markQuestionStart() {
    this.questionStartedAt = Date.now()
  }

  peekElapsedMs(): number | undefined {
    if (!this.questionStartedAt) return undefined
    return Math.max(0, Date.now() - this.questionStartedAt)
  }

  /** Temps passé sur la question courante, puis reset du chrono. */
  consumeElapsedMs(): number | undefined {
    const ms = this.peekElapsedMs()
    this.questionStartedAt = Date.now()
    return ms
  }

  track(
    event: TrackEventName,
    context?: TrackContext | null,
    payload?: TrackPayload | null,
  ) {
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.splice(0, Math.floor(MAX_BUFFER / 2))
    }
    this.buffer.push({
      event,
      sessionId: this.sessionId,
      context: context ?? null,
      payload: payload ?? null,
      clientTs: new Date().toISOString(),
      appVersion: appVersion(),
      platform: Platform.OS,
    })
    this.schedulePersist()
    if (this.buffer.length >= FLUSH_THRESHOLD) {
      void this.flush()
    }
  }

  /** Remet à zéro (déconnexion / purge). */
  reset() {
    this.buffer = []
    this.activeContext = null
    this.questionStartedAt = null
    this.examPaused = false
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined)
  }

  private schedulePersist() {
    if (this.persistTimer) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      void this.persist()
    }, 400)
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer.slice(-MAX_BUFFER)))
    } catch {
      // ignore storage errors
    }
  }

  private async hydrate() {
    if (this.hydrated) return
    this.hydrated = true
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as TrackEvent[]
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const existing = new Set(this.buffer.map((e) => `${e.event}|${e.clientTs}`))
      const restored = parsed.filter((e) => e && e.event && !existing.has(`${e.event}|${e.clientTs}`))
      this.buffer = [...restored, ...this.buffer].slice(-MAX_BUFFER)
      if (this.buffer.length > 0) void this.flush()
    } catch {
      // ignore
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return
    const token = await getStoredToken().catch(() => null)
    if (!token) {
      await this.persist()
      return
    }

    this.flushing = true
    const batch = this.buffer.splice(0, FLUSH_THRESHOLD)
    try {
      const response = await fetch(`${getApiBase()}/tracking/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mobile',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: batch }),
      })
      if (!response.ok) {
        throw new Error(`track flush ${response.status}`)
      }
      await this.persist()
    } catch {
      // Réinsère en tête pour une prochaine tentative (borné).
      this.buffer.unshift(...batch.slice(0, MAX_BUFFER - this.buffer.length))
      await this.persist()
    } finally {
      this.flushing = false
    }
  }
}

export const tracker = new Tracker()
