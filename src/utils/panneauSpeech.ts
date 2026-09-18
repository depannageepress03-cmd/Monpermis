/** Lecture des définitions de panneaux : MP3 humain en priorité, TTS système en secours. */

let speaking = false
let currentAudio: HTMLAudioElement | null = null

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const score = (v: SpeechSynthesisVoice) => {
    const name = `${v.name} ${v.lang}`.toLowerCase()
    let s = 0
    if (/^fr([-_]|$)/i.test(v.lang)) s += 50
    if (/fr[-_]fr/i.test(v.lang)) s += 20
    if (/africa|africain|senegal|ivoire|cameroon|congo|mali|benin|togo|niger|gabon|rwanda/i.test(name))
      s += 80
    if (/neural|enhanced|premium|natural|online|google|microsoft|apple/i.test(name)) s += 25
    if (/thomas|amelie|amélie|denise|henri|julie|aurelie|aurélie|hortense/i.test(name)) s += 15
    if (v.localService === false) s += 10
    return s
  }

  return [...voices].sort((a, b) => score(b) - score(a))[0] || null
}

export function stopPanneauSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.removeAttribute('src')
      currentAudio.load()
    } catch {
      // ignore
    }
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  speaking = false
}

export function isPanneauSpeaking() {
  return speaking
}

function speakWithSystemTts(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return
  }

  const speak = () => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickFrenchVoice()
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || 'fr-FR'
    } else {
      utterance.lang = 'fr-FR'
    }
    utterance.rate = 0.92
    utterance.pitch = 1
    speaking = true
    utterance.onend = () => {
      speaking = false
      onEnd?.()
    }
    utterance.onerror = () => {
      speaking = false
      onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
  }

  // Chrome charge les voix de façon async
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      speak()
    }
    window.setTimeout(speak, 250)
  } else {
    speak()
  }
}

function playMp3(url: string, onEnd?: () => void, onFail?: () => void) {
  stopPanneauSpeech()
  const audio = new Audio(url)
  currentAudio = audio
  speaking = true
  audio.onended = () => {
    speaking = false
    currentAudio = null
    onEnd?.()
  }
  audio.onerror = () => {
    speaking = false
    currentAudio = null
    onFail?.()
  }
  void audio.play().catch(() => {
    speaking = false
    currentAudio = null
    onFail?.()
  })
}

/** Phrase lue à voix haute : code + définition. */
export function buildPanneauSpeechText(code: string, definition: string) {
  const def = String(definition || '').trim()
  const c = String(code || '').trim()
  if (def && def !== c) return `Panneau ${c}. ${def}`
  return `Panneau ${c}`
}

/**
 * Lit d’abord l’audio pré-généré (voix humaine), sinon TTS système FR.
 */
export function speakPanneau(
  opts: {
    code: string
    definition: string
    audioUrl?: string | null
  },
  onEnd?: () => void,
) {
  const text = buildPanneauSpeechText(opts.code, opts.definition)
  const url = String(opts.audioUrl || '').trim()
  if (url) {
    playMp3(url, onEnd, () => speakWithSystemTts(text, onEnd))
    return
  }
  speakWithSystemTts(text, onEnd)
}

/** @deprecated préfère speakPanneau */
export function speakPanneauText(text: string, onEnd?: () => void) {
  speakWithSystemTts(text, onEnd)
}
