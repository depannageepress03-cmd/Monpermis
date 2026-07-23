const PAUSE_MS = 80

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx) sharedCtx = new AC()
  if (sharedCtx.state === 'suspended') void sharedCtx.resume()
  return sharedCtx
}

async function playTone(
  frequency: number,
  durationMs: number,
  options?: { type?: OscillatorType; gain?: number },
) {
  const ctx = getCtx()
  if (!ctx) {
    await wait(durationMs)
    return
  }
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = options?.type ?? 'sine'
  osc.frequency.value = frequency
  const peak = options?.gain ?? 0.18
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000 + 0.02)
  await wait(durationMs + PAUSE_MS)
}

function speakFrench(text: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve()
      return
    }
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'
      utterance.rate = 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
      window.setTimeout(resolve, 900)
    } catch {
      resolve()
    }
  })
}

export type CountdownValue = 5 | 4 | 3 | 2 | 1 | 0

/**
 * Décompte 5 → 0 sur exactement 5 secondes (1 s par tick jusqu’à 0).
 */
export async function playCountdown5to0(onTick?: (n: CountdownValue) => void) {
  const steps: CountdownValue[] = [5, 4, 3, 2, 1, 0]
  const started = Date.now()
  for (let i = 0; i < steps.length; i += 1) {
    const n = steps[i]
    onTick?.(n)
    if (n > 0) {
      void speakFrench(String(n))
      void playTone(720 + (5 - n) * 50, 80, { gain: 0.1 })
    } else {
      void speakFrench('zéro')
    }
    const target = started + (i + 1) * 1000
    const delay = Math.max(0, target - Date.now())
    await wait(delay)
  }
}

/** Sonnerie de fin de temps. */
export async function playGongSound() {
  await playTone(392, 420, { type: 'triangle', gain: 0.22 })
  await playTone(523, 280, { type: 'triangle', gain: 0.16 })
}

export async function playSuccessSound() {
  await playTone(523, 120, { gain: 0.16 })
  await playTone(659, 140, { gain: 0.18 })
  await playTone(784, 220, { gain: 0.2 })
}

export async function playFailSound() {
  await playTone(320, 180, { type: 'square', gain: 0.12 })
  await playTone(220, 320, { type: 'square', gain: 0.14 })
}

/** Rejoue un média distant sans bloquer longtemps (fire-and-forget possible). */
export function playRemoteAudio(url: string): Promise<void> {
  const src = url.trim()
  if (!src || typeof window === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src)
      audio.preload = 'auto'
      const finish = () => {
        audio.removeEventListener('ended', finish)
        audio.removeEventListener('error', finish)
        resolve()
      }
      audio.addEventListener('ended', finish, { once: true })
      audio.addEventListener('error', finish, { once: true })
      void audio.play().catch(() => finish())
      window.setTimeout(finish, 120000)
    } catch {
      resolve()
    }
  })
}
