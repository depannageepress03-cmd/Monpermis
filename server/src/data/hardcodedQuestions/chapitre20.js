/**
 * Banque questions en dur — Chapitre 20.
 * Audio : /content/code-audio/chapitre-20/{n}.mp3
 * (anciennement chapitre 21 — décalage catalogue 20 chapitres)
 */

export const CHAPITRE_20_KEY = 'chapitre-20'
export const CHAPITRE_20_ORDER = 20

/** Détecte un chapitre Mongo correspondant au chapitre 20 figé. */
export function matchesChapitre20(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_20_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*20\b/i.test(name) || /^20([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-20/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch20-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch20-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_20_KEY,
    chapterOrder: CHAPITRE_20_ORDER,
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
export const CHAPITRE_20_QUESTIONS = [
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
