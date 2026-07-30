/**
 * Banque questions en dur — Chapitre 6.
 * Audio : /content/code-audio/chapitre-6/{n}.mp3
 * Corrections réponses fournies 2026-07-30.
 */

export const CHAPITRE_06_KEY = 'chapitre-6'
export const CHAPITRE_06_ORDER = 6

/** Détecte un chapitre Mongo correspondant au chapitre 6 figé. */
export function matchesChapitre06(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_06_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*6(?!\d)/i.test(name) || /^6([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-6/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch6-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch6-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_06_KEY,
    chapterOrder: CHAPITRE_06_ORDER,
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

/** 30 questions — énoncé audio uniquement. */
export const CHAPITRE_06_QUESTIONS = [
  question(1, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B', 'C'], ['C']),
  question(4, ['A', 'B', 'C'], ['A']),
  question(5, ['A', 'B', 'C', 'D'], ['C']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C', 'D'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['B']),
  question(9, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(10, ['A', 'B', 'C'], ['B']),
  question(11, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(12, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(13, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(14, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(15, ['A', 'B', 'C'], ['B']),
  question(16, ['A', 'B', 'C'], ['C']),
  question(17, ['A', 'B'], ['B']),
  question(18, ['A', 'B', 'C'], ['A']),
  question(19, ['A', 'B', 'C'], ['C']),
  question(20, ['A', 'B', 'C'], ['C']),
  question(21, ['A', 'B', 'C'], ['B']),
  question(22, ['A', 'B', 'C'], ['C']),
  question(23, ['A', 'B', 'C'], ['C']),
  question(24, ['A', 'B', 'C', 'D'], ['C']),
  question(25, ['A', 'B', 'C'], ['B']),
  question(26, ['A', 'B', 'C', 'D'], ['D']),
  question(27, ['A', 'B', 'C', 'D'], ['A']),
  question(28, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(29, ['A', 'B', 'C'], ['A', 'C']),
  question(30, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'E']),
]
