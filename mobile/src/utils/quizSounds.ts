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
  seekTo: (n: number) => void
  pause?: () => void
  remove?: () => void
  addListener?: (
    event: string,
    cb: (status: { didJustFinish?: boolean }) => void,
  ) => { remove: () => void }
}

async function playUri(uri: string) {
  try {
    const audio = await import('expo-audio')
    const player = audio.createAudioPlayer({ uri }) as Player
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
      const safety = setTimeout(finish, 4000)
      try {
        player.seekTo(0)
        player.play()
      } catch {
        finish()
      }
    })
  } catch {
    await wait(200)
  }
}

export async function playCountdown123(onTick?: (n: 1 | 2 | 3) => void) {
  const freqs = [660, 740, 820]
  for (let i = 0; i < 3; i += 1) {
    const n = (i + 1) as 1 | 2 | 3
    onTick?.(n)
    await playUri(toneWavUri(freqs[i], 160, 0.4))
    await wait(450)
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
