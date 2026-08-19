/**
 * Banque questions en dur — Chapitre 17.
 * Audio : /content/code-audio/chapitre-17/{n}.mp3
 */

export const CHAPITRE_17_KEY = 'chapitre-17'
export const CHAPITRE_17_ORDER = 17

/** Détecte un chapitre Mongo correspondant au chapitre 17 figé. */
export function matchesChapitre17(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_17_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*17\b/i.test(name) || /^17([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-17/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch18-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch18-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_17_KEY,
    chapterOrder: CHAPITRE_17_ORDER,
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

/** 26 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_17_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['A', 'B']),
  question(2, ['A', 'B'], ['B']),
  question(3, ['A', 'B'], ['B']),
  question(4, ['A', 'B'], ['A']),
  question(5, ['A', 'B', 'C'], ['C']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C', 'D'], ['A']),
  question(8, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(9, ['A', 'B', 'C'], ['A']),
  question(10, ['A', 'B', 'C', 'D'], ['B']),
  question(11, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(12, ['A', 'B', 'C'], ['A', 'B']),
  question(13, ['A', 'B', 'C', 'D'], ['C']),
  question(14, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(15, ['A', 'B', 'C', 'D'], ['A']),
  question(16, ['A', 'B', 'C', 'D'], ['D']),
  question(17, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(18, ['A', 'B', 'C'], ['C']),
  question(19, ['A', 'B', 'C'], ['C']),
  question(20, ['A', 'B', 'C'], ['A', 'C']),
  question(21, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(22, ['A', 'B', 'C'], ['A']),
  question(23, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(24, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(25, ['A', 'B', 'C'], ['A']),
  question(26, ['A', 'B', 'C'], ['C']),
]
