/**
 * Banque questions en dur — Chapitre 10 (mécanique, entretien).
 * Audio : /content/code-audio/chapitre-10/{n}.mp3
 * 67 questions — 2026-08-19.
 */

export const CHAPITRE_10_KEY = 'chapitre-10'
export const CHAPITRE_10_ORDER = 10

/** Détecte un chapitre Mongo correspondant au chapitre 10 figé. */
export function matchesChapitre10(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_10_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*10\b/i.test(name) || /^10([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-10/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch10-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch10-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_10_KEY,
    chapterOrder: CHAPITRE_10_ORDER,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: [],
    },
    answers: answers(order, letterOptions, correctLetters),
  }
}

/** 67 questions — mécanique, entretien, visibilité. */
export const CHAPITRE_10_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['C']),
  question(2, ['A', 'B', 'C'], ['B']),
  question(3, ['A', 'B', 'C', 'D'], ['A']),
  question(4, ['A', 'B', 'C', 'D'], ['A']),
  question(5, ['A', 'B', 'C', 'D'], ['D']),
  question(6, ['A', 'B', 'C', 'D'], ['D']),
  question(7, ['A', 'B', 'C'], ['C']),
  question(8, ['A', 'B', 'C'], ['C']),
  question(9, ['A', 'B', 'C', 'D'], ['A']),
  question(10, ['A', 'B', 'C'], ['C']),
  question(11, ['A', 'B', 'C'], ['B', 'C']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C'], ['B']),
  question(14, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'E']),
  question(15, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(16, ['A', 'B', 'C'], ['B']),
  question(17, ['A', 'B', 'C'], ['C']),
  question(18, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(19, ['A', 'B', 'C'], ['B']),
  question(20, ['A', 'B', 'C'], ['C']),
  question(21, ['A', 'B', 'C'], ['C']),
  question(22, ['A', 'B', 'C'], ['C']),
  question(23, ['A', 'B', 'C', 'D'], ['A']),
  question(24, ['A', 'B', 'C', 'D'], ['D']),
  question(25, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(26, ['A', 'B', 'C'], ['B']),
  question(27, ['A', 'B', 'C', 'D'], ['D']),
  question(28, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(29, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(30, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(31, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(32, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(33, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(34, ['A', 'B', 'C', 'D'], ['A']),
  question(35, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(36, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(37, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(38, ['A', 'B', 'C'], ['B']),
  question(39, ['A', 'B'], ['A']),
  question(40, ['A', 'B', 'C'], ['A', 'B']),
  question(41, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(42, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(43, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(44, ['A', 'B', 'C'], ['B']),
  question(45, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(46, ['A', 'B', 'C'], ['A', 'C']),
  question(47, ['A', 'B', 'C'], ['A', 'C']),
  question(48, ['A', 'B', 'C'], ['A']),
  question(49, ['A', 'B', 'C'], ['B']),
  question(50, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(51, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(52, ['A', 'B'], ['B']),
  question(53, ['A', 'B', 'C'], ['B']),
  question(54, ['A', 'B'], ['B']),
  question(55, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(56, ['A', 'B', 'C'], ['C']),
  question(57, ['A', 'B', 'C'], ['C']),
  question(58, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(59, ['A', 'B', 'C'], ['C']),
  question(60, ['A', 'B', 'C'], ['B', 'C']),
  question(61, ['A', 'B', 'C'], ['B', 'C']),
  question(62, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(63, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(64, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(65, ['A', 'B', 'C'], ['C']),
  question(66, ['A', 'B', 'C', 'D'], ['C']),
  question(67, ['A', 'B', 'C', 'D'], ['C']),
]
