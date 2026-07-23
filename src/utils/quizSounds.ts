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
      utterance.rate = 0.95
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
      window.setTimeout(resolve, 1800)
    } catch {
      resolve()
    }
  })
}

/** Décompte vocal 1 → 2 → 3. */
export async function playCountdown123(onTick?: (n: 1 | 2 | 3) => void) {
  for (const n of [1, 2, 3] as const) {
    onTick?.(n)
    await speakFrench(String(n))
    await playTone(880 + n * 40, 120, { gain: 0.12 })
    await wait(220)
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
