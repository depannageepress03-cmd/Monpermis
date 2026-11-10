/**
 * Banque questions en dur — Chapitre 11 (situations, marquage, priorités).
 * Audio : /content/code-audio/chapitre-11/{n}.mp3
 * Images : /content/code-images/chapitre-11/{n}.png
 * 82 questions — 2026-08-19.
 *
 * Justes renseignées seulement quand la règle est générale (sans image).
 * Les questions de situation restent à compléter.
 */

export const CHAPITRE_11_KEY = 'chapitre-11'
export const CHAPITRE_11_ORDER = 11

/** Détecte un chapitre Mongo correspondant au chapitre 11 figé. */
export function matchesChapitre11(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_11_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*11\b/i.test(name) || /^11([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-11/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-11/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 40, 41, 43, 44, 45, 46, 47, 48, 51, 53, 55, 56, 57, 60, 64, 66, 70, 71, 72, 73, 75, 76, 79, 80, 81, 82,
])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch11-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch11-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_11_KEY,
    chapterOrder: CHAPITRE_11_ORDER,
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

/** 82 questions — situations de conduite. */
export const CHAPITRE_11_QUESTIONS = [
  question(1, ['A', 'B'], ['B']),
  question(2, ['A', 'B'], ['A']),
  question(3, ['A', 'B'], ['B']),
  question(4, ['A', 'B', 'C'], ['C']),
  question(5, ['A', 'B'], ['B']),
  question(6, ['A', 'B'], ['A']),
  question(7, ['A', 'B'], ['B']),
  question(8, ['A', 'B'], ['A']),
  question(9, ['A', 'B'], ['A']),
  question(10, ['A', 'B'], ['A']),
  question(11, ['A', 'B'], ['B']),
  question(12, ['A', 'B', 'C', 'D'], ['B']),
  question(13, ['A', 'B'], ['A']),
  question(14, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(15, ['A', 'B', 'C', 'D'], ['B']),
  question(16, ['A', 'B'], ['B']),
  question(17, ['A', 'B'], ['A']),
  question(18, ['A', 'B'], ['B']),
  question(19, ['A', 'B'], ['B']),
  question(20, ['A', 'B'], ['A']),
  question(21, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(22, ['A', 'B', 'C'], ['B']),
  question(23, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(24, ['A', 'B'], ['B']),
  question(25, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(26, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(27, ['A', 'B'], ['A']),
  question(28, ['A', 'B', 'C'], ['A']),
  question(29, ['A', 'B', 'C'], ['A']),
  question(30, ['A', 'B'], ['A']),
  question(31, ['A', 'B', 'C'], ['B']),
  question(32, ['A', 'B'], ['B']),
  question(33, ['A', 'B'], ['B']),
  question(34, ['A', 'B'], ['A']),
  question(35, ['A', 'B'], ['A']),
  question(36, ['A', 'B', 'C'], ['C']),
  question(37, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(38, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(39, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(40, ['A', 'B'], ['B']),
  question(41, ['A', 'B'], ['B']),
  question(42, ['A', 'B'], ['B']),
  question(43, ['A', 'B'], ['B']),
  question(44, ['A', 'B'], ['B']),
  question(45, ['A', 'B'], ['B']),
  question(46, ['A', 'B', 'C'], ['B', 'C']),
  question(47, ['A', 'B'], ['B']),
  question(48, ['A', 'B'], ['B']),
  question(49, ['A', 'B'], ['B']),
  question(50, ['A', 'B', 'C'], ['C']),
  question(51, ['A', 'B'], ['B']),
  question(52, ['A', 'B'], ['B']),
  question(53, ['A', 'B'], ['A']),
  question(54, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(55, ['A', 'B'], ['A']),
  question(56, ['A', 'B'], ['B']),
  question(57, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(58, ['A', 'B'], ['A']),
  question(59, ['A', 'B'], ['A']),
  question(60, ['A', 'B'], ['B']),
  question(61, ['A', 'B'], ['B']),
  question(62, ['A', 'B', 'C'], ['C']),
  question(63, ['A', 'B'], ['A']),
  question(64, ['A', 'B'], ['A']),
  question(65, ['A', 'B'], ['A']),
  question(66, ['A', 'B'], ['A']),
  question(67, ['A', 'B'], ['A']),
  question(68, ['A', 'B'], ['A']),
  question(69, ['A', 'B'], ['B']),
  question(70, ['A', 'B'], ['B']),
  question(71, ['A', 'B', 'C'], ['A']),
  question(72, ['A', 'B'], ['B']),
  question(73, ['A', 'B'], ['A']),
  question(74, ['A', 'B'], ['B']),
  question(75, ['A', 'B'], ['B']),
  question(76, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(77, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(78, ['A', 'B'], ['A']),
  question(79, ['A', 'B'], ['B']),
  question(80, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(81, ['A', 'B'], ['B']),
  question(82, ['A', 'B', 'C', 'D'], ['B', 'C']),
]
