import { Volume2 } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native'
import { brand } from '../theme'

type Props = {
  uri?: string | null
  label?: string
  style?: ViewStyle
  /** Lance l’audio dès que la source est prête (énoncé de question). */
  autoPlay?: boolean
}

type AudioModule = typeof import('expo-audio')

/**
 * Lecture audio à la demande (évite de charger expo-audio au démarrage de l’app).
 */
export function PlayAudioButton({ uri, label = 'Écouter', style, autoPlay = false }: Props) {
  const sourceUri = uri?.trim() || ''
  const playerRef = useRef<{
    play: () => void
    seekTo: (n: number) => void
    remove?: () => void
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    playerRef.current = null

    if (!sourceUri) return

    void import('expo-audio')
      .then((audio: AudioModule) => {
        if (cancelled) return
        const player = audio.createAudioPlayer({ uri: sourceUri })
        playerRef.current = player
        if (autoPlay) {
          try {
            player.seekTo(0)
            player.play()
          } catch {
            // ignore playback errors
          }
        }
      })
      .catch(() => {
        playerRef.current = null
      })

    return () => {
      cancelled = true
      try {
        playerRef.current?.remove?.()
      } catch {
        // ignore
      }
      playerRef.current = null
    }
  }, [sourceUri, autoPlay])

  if (!sourceUri) return null

  return (
    <Pressable
      style={[styles.btn, style]}
      onPress={() => {
        const player = playerRef.current
        if (!player) return
        try {
          player.seekTo(0)
          player.play()
        } catch {
          // ignore playback errors
        }
      }}
      hitSlop={8}
    >
      <Volume2 size={18} color={brand.navy} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.navy,
  },
})
