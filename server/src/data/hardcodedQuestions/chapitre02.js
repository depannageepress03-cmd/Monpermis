/**
 * Banque questions en dur — Chapitre 2 (priorités / intersections).
 * Audio : /content/code-audio/chapitre-2/{n}.mp3 (à générer)
 * Images : /content/code-images/chapitre-2/{n}.png
 * Mis à jour — 2026-08-06.
 */

export const CHAPITRE_02_KEY = 'chapitre-2'
export const CHAPITRE_02_ORDER = 2

/** Détecte un chapitre Mongo correspondant au chapitre 2 figé. */
export function matchesChapitre02(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_02_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*2\b/i.test(name) || /^2([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-2/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-2/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([13, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch2-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch2-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_02_KEY,
    chapterOrder: CHAPITRE_02_ORDER,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: answers(order, letterOptions, correctLetters),
  }
}

/**
 * 30 questions — doublons OCR retirés.
 * Images : schémas d'intersection I-*.
 * Audios : à générer.
 */
export const CHAPITRE_02_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['C']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B', 'C'], ['B']),
  question(4, ['A', 'B', 'C'], ['B']),
  question(5, ['A', 'B', 'C'], ['B']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(9, ['A', 'B', 'C'], ['C']),
  question(10, ['A', 'B', 'C'], ['C']),
  question(11, ['A', 'B', 'C', 'D'], ['B']),
  question(12, ['A', 'B', 'C', 'D'], ['C']),
  question(13, ['A', 'B', 'C'], ['A']),
  question(14, ['A', 'B', 'C'], ['B']),
  question(15, ['A', 'B', 'C'], ['B']),
  question(16, ['A', 'B', 'C'], ['C']),
  question(17, ['A', 'B', 'C', 'D'], ['B']),
  question(18, ['A', 'B', 'C'], ['C']),
  question(19, ['A', 'B', 'C', 'D'], ['B']),
  question(20, ['A', 'B', 'C'], ['B']),
  question(21, ['A', 'B', 'C', 'D'], ['C']),
  question(22, ['A', 'B', 'C'], ['C']),
  question(23, ['A', 'B'], ['B']),
  question(24, ['A', 'B', 'C', 'D'], ['A']),
  question(25, ['A', 'B', 'C'], ['C']),
  question(26, ['A', 'B'], ['A']),
  question(27, ['A', 'B', 'C'], ['C']),
  question(28, ['A', 'B', 'C'], ['C']),
  question(29, ['A', 'B', 'C'], ['C']),
  question(30, ['A', 'B', 'C'], ['C']),
]

export {
  toAdminHardcodedQuestion,
  toPublicHardcodedQuestion,
} from './serialize.js'
