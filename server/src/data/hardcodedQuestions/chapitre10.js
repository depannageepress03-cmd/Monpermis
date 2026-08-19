/**
 * Banque questions en dur — Chapitre 10 (mécanique, entretien).
 * Audio : /content/code-audio/chapitre-10/{n}.mp3
 * Mis à jour — 2026-08-19.
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

/**
 * 23 questions — mécanique, entretien.
 */
export const CHAPITRE_10_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['B']),
  question(2, ['A', 'B', 'C', 'D'], ['D']),
  question(3, ['A', 'B', 'C', 'D'], ['D']),
  question(4, ['A', 'B', 'C'], ['C']),
  question(5, ['A', 'B', 'C'], ['C']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(9, ['A', 'B', 'C'], ['C']),
  question(10, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(11, ['A', 'B', 'C'], ['B']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C'], ['B']),
  question(14, ['A', 'B', 'C', 'D'], ['A']),
  question(15, ['A', 'B', 'C'], ['C']),
  question(16, ['A', 'B', 'C'], ['C']),
  question(17, ['A', 'B', 'C', 'D'], ['A']),
  question(18, ['A', 'B', 'C'], ['B']),
  question(19, ['A', 'B', 'C', 'D'], ['C']),
  question(20, ['A', 'B', 'C'], ['C']),
  question(21, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(22, ['A', 'B', 'C'], ['B', 'C']),
  question(23, ['A', 'B', 'C'], ['B', 'C']),
]
