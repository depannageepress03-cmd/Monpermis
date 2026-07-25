import { ensureAudioSession } from './audioSession'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** Mini WAV mono 16-bit PCM en data URI. */
function toneWavUri(frequency: number, durationMs: number, volume = 0.35): string {
  const sampleRate = 22050
  const samples = Math.max(1, Math.floor((sampleRate * durationMs) / 1000))
  const data = new Int16Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate
    const fade = Math.min(1, i / (sampleRate * 0.01), (samples - i) / (sampleRate * 0.04))
    data[i] = Math.sin(2 * Math.PI * frequency * t) * volume * fade * 32767
  }

  const buffer = new ArrayBuffer(44 + data.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, data.length * 2, true)
  let offset = 44
  for (let i = 0; i < data.length; i += 1) {
    view.setInt16(offset, data[i], true)
    offset += 2
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return `data:audio/wav;base64,${btoa(binary)}`
}

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

async function waitUntilLoaded(player: Player, timeoutMs = 15000) {
  if (player.isLoaded) return true
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

async function playUri(uri: string, maxMs = 4000) {
  try {
    await ensureAudioSession()
    const audio = await import('expo-audio')
    const player = audio.createAudioPlayer({ uri }, { downloadFirst: true }) as Player
    if (typeof player.volume === 'number') player.volume = 1

    const loaded = await waitUntilLoaded(player)
    if (!loaded) {
      try {
        player.remove?.()
      } catch {
        // ignore
      }
      return
    }

    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        sub?.remove?.()
        clearTimeout(safety)
        try {
          player.pause?.()
          player.remove?.()
        } catch {
          // ignore
        }
        resolve()
      }
      const sub = player.addListener?.('playbackStatusUpdate', (status) => {
        if (status?.didJustFinish) finish()
      })
      const safety = setTimeout(finish, maxMs)
      void (async () => {
        try {
          await Promise.resolve(player.seekTo(0))
          player.play()
        } catch {
          finish()
        }
      })()
    })
  } catch {
    await wait(200)
  }
}

export type CountdownValue = 5 | 4 | 3 | 2 | 1 | 0

/** Décompte 5 → 0 en exactement 5 secondes. */
export async function playCountdown5to0(
  onTick?: (n: CountdownValue) => void,
  isCancelled?: () => boolean,
) {
  const steps: CountdownValue[] = [5, 4, 3, 2, 1, 0]
  const freqs = [920, 860, 800, 740, 680, 520]
  const started = Date.now()
  for (let i = 0; i < steps.length; i += 1) {
    if (isCancelled?.()) return
    const n = steps[i]
    onTick?.(n)
    void playUri(toneWavUri(freqs[i], n === 0 ? 220 : 120, 0.4), 600)
    if (i < steps.length - 1) {
      const target = started + (i + 1) * 1000
      while (Date.now() < target) {
        if (isCancelled?.()) return
        await wait(Math.min(100, target - Date.now()))
      }
    } else {
      await wait(280)
    }
  }
}

export async function playGongSound() {
  await playUri(toneWavUri(392, 280, 0.45))
  await playUri(toneWavUri(523, 220, 0.35))
}

export async function playSuccessSound() {
  await playUri(toneWavUri(523, 110, 0.35))
  await playUri(toneWavUri(659, 130, 0.4))
  await playUri(toneWavUri(784, 220, 0.45))
}

export async function playFailSound() {
  await playUri(toneWavUri(280, 200, 0.35))
  await playUri(toneWavUri(180, 320, 0.4))
}

/** Rejoue l’audio question (peut tourner en parallèle du passage suivant). */
export function playRemoteAudio(url: string): Promise<void> {
  const src = url.trim()
  if (!src) return Promise.resolve()
  return playUri(src, 120000)
}
