let ready: Promise<void> | null = null

/** Configure la session audio une seule fois (mode silencieux iOS inclus). */
export function ensureAudioSession(): Promise<void> {
  if (!ready) {
    ready = import('expo-audio')
      .then((audio) =>
        audio.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        }),
      )
      .catch(() => undefined)
      .then(() => undefined)
  }
  return ready
}
