/**
 * Banque questions en dur — Chapitre 2 (priorités / intersections / dépassement).
 * Audio : /content/code-audio/chapitre-2/{n}.mp3
 * Images : /content/code-images/chapitre-2/{n}.png
 * Mis à jour — 2026-08-18.
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
const QUESTIONS_WITH_IMAGES = new Set([
  13, 18, 19, 20, 21, 22, 23, 24, 26, 27,
  28, 29, 30, 32, 33, 34, 36, 37, 38, 39,
  40, 41, 42, 43, 69, 70, 71, 72, 73,
  80, 81, 82, 83, 84, 85, 86, 87,
])

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
 * 55 questions — priorités, intersections, dépassement.
 * Audios : à générer.
 */
export const CHAPITRE_02_QUESTIONS = [
  // --- Priorités / Intersections ---
  question(1, ['A', 'B', 'C'], ['C']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B', 'C'], ['B']),
  question(4, ['A', 'B', 'C'], ['B']),
  question(5, ['A', 'B', 'C'], ['B']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['A']),
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
  question(20, ['A', 'B', 'C'], ['C']),
  question(21, ['A', 'B', 'C', 'D'], ['C']),
  question(22, ['A', 'B', 'C', 'D'], ['B']),
  question(23, ['A', 'B'], ['A']),
  question(24, ['A', 'B', 'C', 'D'], ['D']),
  question(25, ['A', 'B', 'C'], ['C']),
  question(26, ['A', 'B'], ['A']),
  question(27, ['A', 'B', 'C'], ['C']),
  question(28, ['A', 'B', 'C'], ['C']),
  question(29, ['A', 'B', 'C'], ['B']),
  question(30, ['A', 'B', 'C'], ['C']),
  question(31, ['A', 'B', 'C'], ['C']),
  question(32, ['A', 'B', 'C'], ['C']),
  question(33, ['A', 'B', 'C'], ['B']),
  question(34, ['A', 'B', 'C'], ['B']),
  question(35, ['A', 'B', 'C'], ['C']),
  question(36, ['A', 'B'], ['A']),
  question(37, ['A', 'B', 'C'], ['C']),
  question(38, ['A', 'B'], ['B']),
  question(39, ['A', 'B', 'C', 'D'], ['D']),
  question(40, ['A', 'B', 'C'], ['B']),
  question(41, ['A', 'B', 'C', 'D'], ['D']),
  question(42, ['A', 'B', 'C'], ['A']),
  question(43, ['A', 'B', 'C', 'D'], ['C']),
  // --- Dépassement ---
  question(44, ['A', 'B', 'C', 'D', 'E'], ['B']),
  question(45, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(46, ['A', 'B', 'C'], ['A']),
  question(47, ['A', 'B', 'C'], ['C']),
  question(48, ['A', 'B', 'C'], ['C']),
  question(49, ['A', 'B', 'C', 'D'], ['A']),
  question(50, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(51, ['A', 'B', 'C'], ['C']),
  question(52, ['A', 'B', 'C'], ['B']),
  question(53, ['A', 'B', 'C'], ['B']),
  question(54, ['A', 'B', 'C'], ['B']),
  question(55, ['A', 'B', 'C'], ['A']),
  question(56, ['A', 'B', 'C'], ['C']),
  question(57, ['A', 'B', 'C'], ['B']),
  question(58, ['A', 'B', 'C'], ['C']),
  question(59, ['A', 'B', 'C'], ['A']),
  question(60, ['A', 'B', 'C', 'D'], ['D']),
  question(61, ['A', 'B', 'C'], ['C']),
  question(62, ['A', 'B', 'C'], ['C']),
  question(63, ['A', 'B', 'C'], ['C']),
  question(64, ['A', 'B', 'C', 'D', 'E'], ['C', 'D', 'E']),
  question(65, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'D', 'E']),
  question(66, ['A', 'B', 'C', 'D', 'E'], ['C']),
  question(67, ['A', 'B', 'C'], ['A']),
  question(68, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(69, ['A', 'B', 'C'], ['C']),
  question(70, ['A', 'B', 'C'], ['A']),
  question(71, ['A', 'B', 'C'], ['A']),
  question(72, ['A', 'B', 'C'], ['A']),
  question(73, ['A', 'B', 'C'], ['B']),
  question(74, ['A', 'B', 'C'], ['B']),
  question(75, ['A', 'B', 'C'], ['A']),
  question(76, ['A', 'B', 'C'], ['B']),
  question(77, ['A', 'B'], ['B']),
  question(78, ['A', 'B', 'C', 'D'], ['D']),
  question(79, ['A', 'B', 'C'], ['B']),
  question(80, ['A', 'B', 'C', 'D', 'E'], ['C', 'D']),
  question(81, ['A', 'B', 'C', 'D', 'E'], ['A', 'E']),
  question(82, ['A', 'B', 'C', 'D', 'E'], ['C', 'D']),
  question(83, ['A', 'B', 'C', 'D', 'E'], ['C', 'E']),
  question(84, ['A', 'B', 'C', 'D', 'E'], ['A', 'E']),
  question(85, ['A', 'B', 'C', 'D', 'E'], ['C', 'E']),
  question(86, ['A', 'B', 'C', 'D', 'E'], ['A', 'E']),
  question(87, ['A', 'B', 'C', 'D'], ['A']),
]

export {
  toAdminHardcodedQuestion,
  toPublicHardcodedQuestion,
} from './serialize.js'
