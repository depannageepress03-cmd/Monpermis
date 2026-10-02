import * as Speech from 'expo-speech'
import { ensureAudioSession } from './audioSession'
import { resolveMediaUrl } from './mediaUrl'

type Player = {
  play: () => void
  seekTo: (n: number) => void | Promise<void>
  pause?: () => void
  remove?: () => void
  volume?: number
  isLoaded?: boolean
  addListener?: (
    event: string,
    cb: (status: { didJustFinish?: boolean; isLoaded?: boolean }) => void,
  ) => { remove: () => void }
}

let currentPlayer: Player | null = null

function speechText(code: string, definition: string) {
  const def = String(definition || '').trim()
  const c = String(code || '').trim()
  if (def && def !== c) return `Panneau ${c}. ${def}`
  return `Panneau ${c}`
}

async function pickFrenchVoiceId(): Promise<string | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    const scored = voices
      .map((v) => {
        const blob = `${v.identifier} ${v.name} ${v.language}`.toLowerCase()
        let score = 0
        if (/^fr/.test(v.language || '')) score += 50
        if (/fr[-_]fr/.test(v.language || '')) score += 20
        if (/africa|africain|senegal|ivoire|cameroon|congo|mali/.test(blob)) score += 80
        if (/enhanced|premium|neural|quality/.test(blob)) score += 20
        return { id: v.identifier, score }
      })
      .sort((a, b) => b.score - a.score)
    return scored[0]?.id
  } catch {
    return undefined
  }
}

function waitUntilLoaded(player: Player, timeoutMs = 12000) {
  if (player.isLoaded) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      sub?.remove?.()
      clearTimeout(safety)
      resolve(ok)
    }
    const sub = player.addListener?.('playbackStatusUpdate', (status) => {
      if (status?.isLoaded || player.isLoaded) finish(true)
    })
    const safety = setTimeout(() => finish(Boolean(player.isLoaded)), timeoutMs)
    if (player.isLoaded) finish(true)
  })
}

function playUntilEnd(player: Player) {
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      sub?.remove?.()
      clearTimeout(safety)
      resolve()
    }
    const sub = player.addListener?.('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) finish()
    })
    const safety = setTimeout(finish, 90_000)
    try {
      void player.seekTo(0)
      player.play()
    } catch {
      finish()
    }
  })
}

export function stopPanneauSpeech() {
  try {
    currentPlayer?.pause?.()
    currentPlayer?.remove?.()
  } catch {
    // ignore
  }
  currentPlayer = null
  try {
    Speech.stop()
  } catch {
    // ignore
  }
}

async function speakSystem(code: string, definition: string, onEnd?: () => void) {
  try {
    const voice = await pickFrenchVoiceId()
    Speech.stop()
    Speech.speak(speechText(code, definition), {
      language: 'fr-FR',
      rate: 0.92,
      voice,
      onDone: () => onEnd?.(),
      onStopped: () => onEnd?.(),
      onError: () => onEnd?.(),
    })
  } catch {
    onEnd?.()
  }
}

export function resolvePanneauAudioUrl(audio?: string | null) {
  const raw = String(audio || '').trim()
  if (!raw) return null
  return resolveMediaUrl(raw) || raw
}

/** MP3 pré-généré (voix humaine) en priorité, sinon TTS appareil. */
export async function speakPanneau(
  opts: {
    code: string
    definition: string
    audioUrl?: string | null
  },
  onEnd?: () => void,
) {
  stopPanneauSpeech()
  const resolved = resolvePanneauAudioUrl(opts.audioUrl)

  if (!resolved) {
    await speakSystem(opts.code, opts.definition, onEnd)
    return
  }

  try {
    await ensureAudioSession()
    const audio = await import('expo-audio')
    const player = audio.createAudioPlayer(
      { uri: resolved },
      { downloadFirst: true },
    ) as Player
    currentPlayer = player
    if (typeof player.volume === 'number') player.volume = 1

    const loaded = await waitUntilLoaded(player)
    if (!loaded || currentPlayer !== player) {
      throw new Error('audio not loaded')
    }
    await playUntilEnd(player)
    if (currentPlayer === player) {
      try {
        player.remove?.()
      } catch {
        // ignore
      }
      currentPlayer = null
    }
    onEnd?.()
  } catch {
    stopPanneauSpeech()
    await speakSystem(opts.code, opts.definition, onEnd)
  }
}
