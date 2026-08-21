/**
 * Banque questions en dur — Chapitre 5 (conduite, sécurité, premiers secours).
 * Audio : /content/code-audio/chapitre-5/{n}.mp3
 * Mis à jour — 2026-08-20 (correction des bonnes réponses).
 */

export const CHAPITRE_05_KEY = 'chapitre-5'
export const CHAPITRE_05_ORDER = 5

/** Détecte un chapitre Mongo correspondant au chapitre 5 figé. */
export function matchesChapitre05(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_05_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*5\b/i.test(name) || /^5([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-5/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch5-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch5-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_05_KEY,
    chapterOrder: CHAPITRE_05_ORDER,
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

/**
 * 55 questions — conduite, sécurité, premiers secours.
 */
export const CHAPITRE_05_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['C']),
  question(2, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(3, ['A', 'B', 'C'], ['B']),
  question(4, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'D']),
  question(5, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(6, ['A', 'B', 'C'], ['C']),
  question(7, ['A', 'B', 'C'], ['B', 'C']),
  question(8, ['A', 'B', 'C', 'D'], ['B']),
  question(9, ['A', 'B', 'C', 'D', 'E'], ['A', 'C', 'D', 'E']),
  question(10, ['A', 'B', 'C'], ['C']),
  question(11, ['A', 'B', 'C'], ['C']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C'], ['C']),
  question(14, ['A', 'B', 'C'], ['C']),
  question(15, ['A', 'B', 'C'], ['A']),
  question(16, ['A', 'B', 'C'], ['C']),
  question(17, ['A', 'B', 'C'], ['B']),
  question(18, ['A', 'B', 'C'], ['B', 'C']),
  question(19, ['A', 'B', 'C'], ['C']),
  question(20, ['A', 'B', 'C', 'D'], ['D']),
  question(21, ['A', 'B', 'C', 'D', 'E'], ['B', 'C', 'D', 'E']),
  question(22, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(23, ['A', 'B', 'C'], ['B']),
  question(24, ['A', 'B', 'C'], ['B']),
  question(25, ['A', 'B', 'C'], ['B']),
  question(26, ['A', 'B', 'C', 'D'], ['D']),
  question(27, ['A', 'B', 'C', 'D'], ['D']),
  question(28, ['A', 'B', 'C'], ['A', 'C']),
  question(29, ['A', 'B', 'C', 'D', 'E'], ['A', 'D', 'E']),
  question(30, ['A', 'B', 'C'], ['C']),
  question(31, ['A', 'B', 'C', 'D', 'E'], ['C']),
  question(32, ['A', 'B', 'C'], ['B']),
  question(33, ['A', 'B', 'C', 'D'], ['C']),
  question(34, ['A', 'B', 'C', 'D'], ['C']),
  question(35, ['A', 'B', 'C'], ['C']),
  question(36, ['A', 'B', 'C'], ['C']),
  question(37, ['A', 'B', 'C'], ['C']),
  question(38, ['A', 'B', 'C'], ['A']),
  question(39, ['A', 'B', 'C', 'D'], ['D']),
  question(40, ['A', 'B', 'C', 'D'], ['D']),
  question(41, ['A', 'B', 'C', 'D'], ['B']),
  question(42, ['A', 'B', 'C'], ['B']),
  question(43, ['A', 'B', 'C', 'D'], ['B']),
  question(44, ['A', 'B', 'C'], ['C']),
  question(45, ['A', 'B', 'C'], ['B']),
  question(46, ['A', 'B', 'C'], ['B']),
  question(47, ['A', 'B', 'C', 'D'], ['D']),
  question(48, ['A', 'B', 'C', 'D'], ['D']),
  question(49, ['A', 'B', 'C'], ['B']),
  question(50, ['A', 'B', 'C'], ['A', 'C']),
  question(51, ['A', 'B', 'C', 'D'], ['D']),
  question(52, ['A', 'B', 'C'], ['A']),
  question(53, ['A', 'B', 'C'], ['A', 'C']),
  question(54, ['A', 'B', 'C'], ['A', 'C']),
  question(55, ['A', 'B', 'C'], ['B']),
]
