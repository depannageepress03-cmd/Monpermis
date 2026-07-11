import { Volume2 } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { brand } from '../theme'

type Props = {
  questionKey: string
  promptUri?: string | null
  answerUris?: (string | null | undefined)[]
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

function cleanUri(uri?: string | null) {
  return uri?.trim() || ''
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
 * Enchaîne audio question puis audios des réponses (invisibles).
 * Bouton pour réécouter uniquement l’énoncé.
 */
export function QuestionAudioSequence({ questionKey, promptUri, answerUris = [] }: Props) {
  const [status, setStatus] = useState('')
  const [ready, setReady] = useState(false)
  const promptPlayerRef = useRef<Player | null>(null)
  const cancelledRef = useRef(false)

  const promptUrl = cleanUri(promptUri)
  const answerUrls = useMemo(() => answerUris.map(cleanUri).filter(Boolean), [answerUris])

  useEffect(() => {
    cancelledRef.current = false
    setReady(false)
    setStatus('')
    promptPlayerRef.current = null

    let localPrompt: Player | null = null
    let localAnswers: Player[] = []

    const cleanup = () => {
      try {
        localPrompt?.pause?.()
        localPrompt?.remove?.()
      } catch {
        // ignore
      }
      localAnswers.forEach((player) => {
        try {
          player.pause?.()
          player.remove?.()
        } catch {
          // ignore
        }
      })
    }

    void import('expo-audio')
      .then(async (audio: AudioModule) => {
        if (cancelledRef.current) return

        if (promptUrl) {
          localPrompt = audio.createAudioPlayer({ uri: promptUrl }) as Player
          promptPlayerRef.current = localPrompt
        }
        localAnswers = answerUrls.map((uri) => audio.createAudioPlayer({ uri }) as Player)
        setReady(true)

        if (localPrompt) {
          setStatus('Écoute de la question…')
          await playUntilEnd(localPrompt)
          if (cancelledRef.current) return
        }

        for (let i = 0; i < localAnswers.length; i += 1) {
          if (cancelledRef.current) return
          setStatus(`Écoute du choix ${String.fromCharCode(97 + i).toUpperCase()}…`)
          await playUntilEnd(localAnswers[i])
        }

        if (!cancelledRef.current) setStatus('')
      })
      .catch(() => {
        setReady(false)
      })

    return () => {
      cancelledRef.current = true
      cleanup()
      promptPlayerRef.current = null
    }
  }, [questionKey, promptUrl, answerUrls])

  if (!promptUrl && answerUrls.length === 0) return null

  return (
    <View style={styles.wrap}>
      {promptUrl ? (
        <Pressable
          style={[styles.btn, !ready && styles.btnDisabled]}
          disabled={!ready}
          onPress={() => {
            const player = promptPlayerRef.current
            if (!player) return
            try {
              player.seekTo(0)
              player.play()
            } catch {
              // ignore
            }
          }}
          hitSlop={8}
        >
          <Volume2 size={18} color={brand.navy} />
          <Text style={styles.label}>Réécouter la question</Text>
        </Pressable>
      ) : null}
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
    backgroundColor: brand.goldLight,
    borderWidth: 1,
    borderColor: `${brand.gold}66`,
  },
  btnDisabled: { opacity: 0.55 },
  label: { fontSize: 14, fontWeight: '700', color: brand.navy },
  status: { fontSize: 13, color: brand.navyMuted, fontWeight: '600' },
})
