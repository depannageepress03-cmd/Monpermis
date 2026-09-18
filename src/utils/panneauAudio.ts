import { resolveMediaUrl } from './mediaUrl'
import {
  buildPanneauSpeechText,
  speakPanneau,
  stopPanneauSpeech,
} from './panneauSpeech'

export { buildPanneauSpeechText, speakPanneau, stopPanneauSpeech }

/** Résout l’URL absolue d’un audio panneau du catalogue. */
export function resolvePanneauAudioUrl(audio?: string | null) {
  const raw = String(audio || '').trim()
  if (!raw) return null
  return resolveMediaUrl(raw) || raw
}
