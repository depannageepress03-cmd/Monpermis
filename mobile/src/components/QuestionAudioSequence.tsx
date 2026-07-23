import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { dark, fonts } from '../theme'
import {
  playCountdown5to0,
  playGongSound,
  type CountdownValue,
} from '../utils/quizSounds'

type Props = {
  questionKey: string
  promptUri?: string | null
  onSequenceComplete?: () => void
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

type AudioModule = typeof import('expo-audio')

const PAUSE_MS = 600

function cleanUri(uri?: string | null) {
  return uri?.trim() || ''
}

function wait(ms: number, isCancelled?: () => boolean) {
  return new Promise<void>((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (isCancelled?.()) {
        resolve()
        return
      }
      if (Date.now() - started >= ms) {
        resolve()
        return
      }
      setTimeout(tick, Math.min(80, ms - (Date.now() - started)))
    }
    tick()
  })
}

async function playUntilEnd(player: Player, isCancelled?: () => boolean) {
  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      sub?.remove?.()
      clearInterval(cancelWatch)
      clearTimeout(safety)
      resolve()
    }
    const sub = player.addListener?.('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) finish()
    })
    const cancelWatch = setInterval(() => {
      if (isCancelled?.()) finish()
    }, 100)
    const safety = setTimeout(finish, 180000)
    try {
      player.seekTo(0)
      player.play()
    } catch {
      finish()
    }
  })
}

/**
 * Lance l’audio automatiquement (×2), puis décompte 5→0.
 * Démonter le composant (Continuer) annule tout sans décompte.
 */
export function QuestionAudioSequence({ questionKey, promptUri, onSequenceComplete }: Props) {
  const [status, setStatus] = useState('')
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)
  const cancelledRef = useRef(false)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const isCancelled = () => cancelledRef.current

  const promptUrl = cleanUri(promptUri)

  useEffect(() => {
    cancelledRef.current = false
    setStatus('')
    setCountdown(null)

    let localPlayer: Player | null = null

    const cleanup = () => {
      try {
        localPlayer?.pause?.()
        localPlayer?.remove?.()
      } catch {
        // ignore
      }
    }

    void (async () => {
      try {
        if (promptUrl) {
          const audio: AudioModule = await import('expo-audio')
          if (cancelledRef.current) return
          localPlayer = audio.createAudioPlayer({ uri: promptUrl }) as Player

          setStatus('Première écoute…')
          await playUntilEnd(localPlayer, isCancelled)
          if (cancelledRef.current) return

          await wait(PAUSE_MS, isCancelled)
          if (cancelledRef.current) return

          setStatus('Deuxième écoute…')
          await playUntilEnd(localPlayer, isCancelled)
          if (cancelledRef.current) return
        }

        setStatus('Décompte…')
        await playCountdown5to0((n) => {
          if (!cancelledRef.current) setCountdown(n)
        }, isCancelled)
        if (cancelledRef.current) return

        setStatus('Temps !')
        await playGongSound()
        if (cancelledRef.current) return

        setCountdown(null)
        setStatus('')
        completeRef.current?.()
      } catch {
        if (!cancelledRef.current) completeRef.current?.()
      } finally {
        cleanup()
      }
    })()

    return () => {
      cancelledRef.current = true
      cleanup()
      setCountdown(null)
      setStatus('')
    }
  }, [questionKey, promptUrl])

  return (
    <View style={styles.wrap}>
      {countdown !== null ? <Text style={styles.countdown}>{countdown}</Text> : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8, alignItems: 'center' },
  countdown: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 72,
    lineHeight: 80,
    color: dark.green,
    textAlign: 'center',
  },
  status: {
    fontSize: 13,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
  },
})
