/**
 * Banque questions en dur — Chapitre 21.
 * Audio : /content/code-audio/chapitre-21/{n}.mp3
 */

export const CHAPITRE_21_KEY = 'chapitre-21'
export const CHAPITRE_21_ORDER = 21

/** Détecte un chapitre Mongo correspondant au chapitre 21 figé. */
export function matchesChapitre21(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_21_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*21\b/i.test(name) || /^21([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-21/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch21-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch21-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_21_KEY,
    chapterOrder: CHAPITRE_21_ORDER,
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

/** 10 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_21_QUESTIONS = [
  question(1, ['A', 'B'], ['B']),
  question(2, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(3, ['A', 'B', 'C', 'D'], ['C']),
  question(4, ['A', 'B', 'C', 'D'], ['B']),
  question(5, ['A', 'B', 'C', 'D'], ['B']),
  question(6, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(7, ['A', 'B', 'C'], ['A', 'C']),
  question(8, ['A', 'B', 'C'], ['B']),
  question(9, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(10, ['A', 'B', 'C'], ['A']),
]

export {
  toAdminHardcodedQuestion,
  toPublicHardcodedQuestion,
} from './serialize.js'
