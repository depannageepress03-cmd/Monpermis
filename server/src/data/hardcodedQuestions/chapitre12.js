/**
 * Banque questions en dur — Chapitre 12 (alcool, distances, fatigue, comportement).
 * Audio : /content/code-audio/chapitre-12/{n}.mp3
 * 69 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_12_KEY = 'chapitre-12'
export const CHAPITRE_12_ORDER = 12

/** Détecte un chapitre Mongo correspondant au chapitre 12 figé. */
export function matchesChapitre12(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_12_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*12\b/i.test(name) || /^12([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-12/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-12/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([4, 5, 6, 7, 9, 11, 13, 16, 17, 23, 32, 58])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch12-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch12-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_12_KEY,
    chapterOrder: CHAPITRE_12_ORDER,
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

/** 69 questions — alcool, distances, fatigue, comportement. */
export const CHAPITRE_12_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['A']),
  question(2, ['A', 'B', 'C'], ['B']),
  question(3, ['A', 'B', 'C'], ['A']),
  question(4, ['A', 'B'], ['B']),
  question(5, ['A', 'B'], ['B']),
  question(6, ['A', 'B', 'C'], ['C']),
  question(7, ['A', 'B'], ['B']),
  question(8, ['A', 'B'], ['B']),
  question(9, ['A', 'B', 'C'], ['C']),
  question(10, ['A', 'B'], ['A']),
  question(11, ['A', 'B'], ['A']),
  question(12, ['A', 'B'], ['A']),
  question(13, ['A', 'B'], ['B']),
  question(14, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(15, ['A', 'B'], ['A']),
  question(16, ['A', 'B'], ['A']),
  question(17, ['A', 'B', 'C'], ['A']),
  question(18, ['A', 'B'], ['B']),
  question(19, ['A', 'B'], ['B']),
  question(20, ['A', 'B', 'C'], ['A', 'B']),
  question(21, ['A', 'B'], ['B']),
  question(22, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(23, ['A', 'B'], ['A']),
  question(24, ['A', 'B'], ['B']),
  question(25, ['A', 'B'], ['B']),
  question(26, ['A', 'B', 'C', 'D'], ['B']),
  question(27, ['A', 'B', 'C', 'D'], ['C']),
  question(28, ['A', 'B', 'C', 'D'], ['B']),
  question(29, ['A', 'B', 'C'], ['A']),
  question(30, ['A', 'B'], ['B']),
  question(31, ['A', 'B', 'C'], ['A', 'B']),
  question(32, ['A', 'B'], ['B']),
  question(33, ['A', 'B', 'C'], ['A']),
  question(34, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(35, ['A', 'B', 'C'], ['B']),
  question(36, ['A', 'B', 'C'], ['B']),
  question(37, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(38, ['A', 'B', 'C', 'D'], ['B']),
  question(39, ['A', 'B'], ['A']),
  question(40, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(41, ['A', 'B', 'C'], ['C']),
  question(42, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(43, ['A', 'B', 'C'], ['B']),
  question(44, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(45, ['A', 'B', 'C'], ['A', 'C']),
  question(46, ['A', 'B', 'C', 'D'], ['C']),
  question(47, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(48, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(49, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(50, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(51, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(52, ['A', 'B', 'C'], ['C']),
  question(53, ['A', 'B'], ['B']),
  question(54, ['A', 'B', 'C', 'D'], ['C']),
  question(55, ['A', 'B', 'C'], ['A']),
  question(56, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(57, ['A', 'B', 'C', 'D'], ['C']),
  question(58, ['A', 'B', 'C'], ['B']),
  question(59, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(60, ['A', 'B', 'C'], ['A']),
  question(61, ['A', 'B', 'C'], ['C']),
  question(62, ['A', 'B'], ['B']),
  question(63, ['A', 'B', 'C', 'D', 'E'], ['A', 'D']),
  question(64, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(65, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(66, ['A', 'B', 'C'], ['A']),
  question(67, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(68, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(69, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
]
