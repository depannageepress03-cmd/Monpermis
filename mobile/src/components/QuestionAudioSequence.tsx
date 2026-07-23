import { Volume2 } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { dark, fonts } from '../theme'

type Props = {
  questionKey: string
  promptUri?: string | null
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

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function playUntilEnd(player: Player) {
  await new Promise<void>((resolve) => {
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
 * Joue l’audio unique (question + choix) deux fois d’affilée.
 * Bouton « Réécouter » relance la double lecture.
 */
export function QuestionAudioSequence({ questionKey, promptUri }: Props) {
  const [status, setStatus] = useState('')
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playerRef = useRef<Player | null>(null)
  const cancelledRef = useRef(false)
  const runIdRef = useRef(0)

  const promptUrl = cleanUri(promptUri)

  const playTwice = useCallback(async (player: Player) => {
    const runId = ++runIdRef.current
    setPlaying(true)

    try {
      setStatus('Première écoute…')
      await playUntilEnd(player)
      if (cancelledRef.current || runId !== runIdRef.current) return

      await wait(PAUSE_MS)
      if (cancelledRef.current || runId !== runIdRef.current) return

      setStatus('Deuxième écoute…')
      await playUntilEnd(player)
    } finally {
      if (!cancelledRef.current && runId === runIdRef.current) {
        setStatus('')
        setPlaying(false)
      }
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    setReady(false)
    setStatus('')
    setPlaying(false)
    playerRef.current = null
    runIdRef.current += 1

    let localPlayer: Player | null = null

    const cleanup = () => {
      try {
        localPlayer?.pause?.()
        localPlayer?.remove?.()
      } catch {
        // ignore
      }
    }

    if (!promptUrl) return cleanup

    void import('expo-audio')
      .then(async (audio: AudioModule) => {
        if (cancelledRef.current) return

        localPlayer = audio.createAudioPlayer({ uri: promptUrl }) as Player
        playerRef.current = localPlayer
        setReady(true)
        await playTwice(localPlayer)
      })
      .catch(() => {
        setReady(false)
      })

    return () => {
      cancelledRef.current = true
      runIdRef.current += 1
      cleanup()
      playerRef.current = null
    }
  }, [questionKey, promptUrl, playTwice])

  if (!promptUrl) return null

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, (!ready || playing) && styles.btnDisabled]}
        disabled={!ready || playing}
        onPress={() => {
          const player = playerRef.current
          if (!player || playing) return
          void playTwice(player)
        }}
        hitSlop={8}
      >
        <Volume2 size={18} color={dark.coral} />
        <Text style={styles.label}>Réécouter</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: dark.coralSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.28)',
  },
  btnDisabled: { opacity: 0.55 },
  label: { fontSize: 14, fontFamily: fonts.bodyBold, color: dark.textPrimary },
  status: { fontSize: 13, color: dark.textMuted, fontFamily: fonts.bodySemiBold },
})
