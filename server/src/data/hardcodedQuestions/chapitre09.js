/**
 * Banque questions en dur — Chapitre 9 (transport en commun).
 * Audio : /content/code-audio/chapitre-9/{n}.mp3
 * Images : /content/code-images/chapitre-9/{n}.png
 * Textes corrigés / dédoublonnés — 2026-07-30.
 */

export const CHAPITRE_09_KEY = 'chapitre-9'
export const CHAPITRE_09_ORDER = 9

/** Détecte un chapitre Mongo correspondant au chapitre 9 figé. */
export function matchesChapitre09(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_09_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*9\b/i.test(name) || /^9([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-9/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-9/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 25, 26, 27, 28, 29])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch9-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch9-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_09_KEY,
    chapterOrder: CHAPITRE_09_ORDER,
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
 * 48 questions.
 * Images : 1 tourner, 25 B34a, 26 B45, 27 B27, 28 chargement, 29 B10a.
 */
export const CHAPITRE_09_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['C']),
  question(2, ['A', 'B', 'C', 'D', 'E'], ['E']),
  question(3, ['A', 'B', 'C', 'D', 'E'], ['A', 'D']),
  question(4, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(5, ['A', 'B', 'C', 'D'], ['D']),
  question(6, ['A', 'B', 'C', 'D'], ['C']),
  question(7, ['A', 'B', 'C', 'D'], ['C']),
  question(8, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(9, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(10, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(11, ['A', 'B', 'C'], ['B']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C', 'D'], ['C']),
  question(14, ['A', 'B', 'C', 'D'], ['A']),
  question(15, ['A', 'B', 'C', 'D'], ['A']),
  question(16, ['A', 'B', 'C', 'D'], ['C']),
  question(17, ['A', 'B', 'C', 'D'], ['B']),
  question(18, ['A', 'B', 'C', 'D'], ['A']),
  question(19, ['A', 'B', 'C'], ['A']),
  question(20, ['A', 'B', 'C'], ['C']),
  question(21, ['A', 'B', 'C'], ['B', 'C']),
  question(22, ['A', 'B', 'C'], ['A']),
  question(23, ['A', 'B', 'C'], ['A']),
  question(24, ['A', 'B', 'C'], ['C']),
  question(25, ['A', 'B', 'C', 'D'], ['D']),
  question(26, ['A', 'B', 'C', 'D'], ['A']),
  question(27, ['A', 'B', 'C', 'D'], ['B']),
  question(28, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(29, ['A', 'B', 'C'], ['C']),
  question(30, ['A', 'B', 'C', 'D'], ['A']),
  question(31, ['A', 'B', 'C'], ['C']),
  question(32, ['A', 'B', 'C'], ['C']),
  question(33, ['A', 'B', 'C'], ['C']),
  question(34, ['A', 'B', 'C'], ['A']),
  question(35, ['A', 'B', 'C'], ['A']),
  question(36, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(37, ['A', 'B', 'C'], ['C']),
  question(38, ['A', 'B', 'C'], ['B']),
  question(39, ['A', 'B', 'C', 'D'], ['A']),
  question(40, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(41, ['A', 'B', 'C', 'D'], ['D']),
  question(42, ['A', 'B', 'C'], ['A']),
  question(43, ['A', 'B'], ['B']),
  question(44, ['A', 'B', 'C', 'D'], ['A']),
  question(45, ['A', 'B', 'C'], ['A']),
  question(46, ['A', 'B', 'C'], ['B']),
  question(47, ['A', 'B', 'C'], ['B']),
  question(48, ['A', 'B', 'C'], ['B']),
]
