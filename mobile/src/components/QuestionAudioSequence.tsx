import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { Mic, Pause, Play } from 'lucide-react-native'
import { brand, dark, fonts, shadows } from '../theme'
import { ensureAudioSession } from '../utils/audioSession'
import { resolveQuestionPromptSource } from '../utils/questionAudio'
import {
  playCountdown5to0,
  playGongSound,
  registerActiveAudioPlayer,
  stopAllQuizAudio,
  unregisterActiveAudioPlayer,
  type CountdownValue,
} from '../utils/quizSounds'

type Props = {
  questionKey: string
  /** URL / chemin éventuel ; si questionId local, l’audio embarqué est prioritaire. */
  promptUri?: string | null
  /** Examens / hors-ligne : uniquement MP3 générés embarqués, jamais le réseau. */
  offlineOnly?: boolean
  onSequenceComplete?: () => void
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

type AudioModule = typeof import('expo-audio')

const PAUSE_MS = 600
const WAVE_BARS = [0.35, 0.7, 0.5, 0.95, 0.45, 0.8, 0.55, 0.9, 0.4, 0.75, 0.6, 0.85, 0.5, 0.7, 0.4]

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

async function waitUntilLoaded(player: Player, isCancelled?: () => boolean, timeoutMs = 20000) {
  if (player.isLoaded) return true
  return new Promise<boolean>((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      sub?.remove?.()
      clearInterval(cancelWatch)
      clearTimeout(safety)
      resolve(ok)
    }
    const sub = player.addListener?.('playbackStatusUpdate', (status) => {
      if (status?.isLoaded || player.isLoaded) finish(true)
    })
    const cancelWatch = setInterval(() => {
      if (isCancelled?.()) finish(false)
    }, 100)
    const safety = setTimeout(() => finish(Boolean(player.isLoaded)), timeoutMs)
    if (player.isLoaded) finish(true)
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
    void (async () => {
      try {
        await Promise.resolve(player.seekTo(0))
        if (isCancelled?.()) {
          finish()
          return
        }
        player.play()
      } catch {
        finish()
      }
    })()
  })
}

function AudioWaveform({ active }: { active: boolean }) {
  const anims = useMemo(
    () => WAVE_BARS.map(() => new Animated.Value(0.35)),
    [],
  )

  useEffect(() => {
    if (!active) {
      anims.forEach((v) => v.setValue(0.35))
      return
    }
    const loops = anims.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 320 + (i % 5) * 40,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.28,
            duration: 280 + (i % 4) * 35,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    )
    loops.forEach((loop, i) => {
      setTimeout(() => loop.start(), i * 45)
    })
    return () => {
      loops.forEach((loop) => loop.stop())
    }
  }, [active, anims])

  return (
    <View style={styles.waveRow} accessibilityElementsHidden>
      {WAVE_BARS.map((base, i) => (
        <Animated.View
          key={`bar-${i}`}
          style={[
            styles.waveBar,
            {
              height: 28 * base,
              transform: [
                {
                  scaleY: anims[i],
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
}

/**
 * Lance l’audio automatiquement (×2), puis décompte 5→0.
 * Démonter le composant (Continuer / fin) annule tout.
 * La simple sélection d’une réponse ne doit pas démonter ce composant.
 */
export function QuestionAudioSequence({
  questionKey,
  promptUri,
  offlineOnly = false,
  onSequenceComplete,
}: Props) {
  const [status, setStatus] = useState('')
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)
  const cancelledRef = useRef(false)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const isCancelled = () => cancelledRef.current

  const listening =
    status.includes('écoute') || status.includes('Chargement') || status.includes('Décompte')
  const playing = status.includes('écoute')

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
      unregisterActiveAudioPlayer(localPlayer)
    }

    void (async () => {
      try {
        await ensureAudioSession()
        if (cancelledRef.current) return

        const source = await resolveQuestionPromptSource(questionKey, promptUri, {
          offlineOnly,
        })
        const promptUrl = source?.uri || ''
        const promptModule = source?.module

        if (promptUrl || promptModule != null) {
          const audio: AudioModule = await import('expo-audio')
          if (cancelledRef.current) return

          const tryCreate = (sourceArg: number | { uri: string }) =>
            audio.createAudioPlayer(sourceArg, { downloadFirst: true }) as Player

          localPlayer = promptUrl
            ? tryCreate({ uri: promptUrl })
            : tryCreate(promptModule as number)

          registerActiveAudioPlayer(localPlayer)
          if (typeof localPlayer.volume === 'number') localPlayer.volume = 1

          setStatus('Chargement audio…')
          let loaded = await waitUntilLoaded(localPlayer, isCancelled)
          if (cancelledRef.current) return

          // Si l’URL réseau échoue, bascule sur le MP3 embarqué (même fichier).
          if (!loaded && !offlineOnly && promptModule != null && promptUrl) {
            try {
              localPlayer.pause?.()
              localPlayer.remove?.()
            } catch {
              // ignore
            }
            unregisterActiveAudioPlayer(localPlayer)
            localPlayer = tryCreate(promptModule)
            registerActiveAudioPlayer(localPlayer)
            if (typeof localPlayer.volume === 'number') localPlayer.volume = 1
            loaded = await waitUntilLoaded(localPlayer, isCancelled)
            if (cancelledRef.current) return
          }

          if (!loaded) {
            setStatus('Audio indisponible')
            await wait(800, isCancelled)
          } else {
            setStatus('Première écoute…')
            await playUntilEnd(localPlayer, isCancelled)
            if (cancelledRef.current) return

            await wait(PAUSE_MS, isCancelled)
            if (cancelledRef.current) return

            setStatus('Deuxième écoute…')
            await playUntilEnd(localPlayer, isCancelled)
            if (cancelledRef.current) return
          }
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
      stopAllQuizAudio()
      setCountdown(null)
      setStatus('')
    }
  }, [questionKey, promptUri, offlineOnly])

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.micCircle}>
          <Mic size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.enonce}>ÉNONCÉ</Text>
      </View>

      {countdown !== null ? (
        <Text style={styles.countdown}>{countdown}</Text>
      ) : (
        <Text style={styles.status}>{status || 'Préparation…'}</Text>
      )}

      <View style={styles.controls}>
        <AudioWaveform active={listening && countdown === null} />
        <View style={styles.playBtn} accessibilityElementsHidden>
          {playing ? (
            <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.greenPale,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enonce: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: dark.green,
    textTransform: 'uppercase',
  },
  status: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  countdown: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 56,
    lineHeight: 64,
    color: dark.green,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  waveRow: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 999,
    backgroundColor: dark.green,
    opacity: 0.85,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
})
