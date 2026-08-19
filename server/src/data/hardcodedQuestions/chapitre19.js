/**
 * Banque questions en dur — Chapitre 19.
 * Audio : /content/code-audio/chapitre-19/{n}.mp3
 * (anciennement chapitre 20 — décalage catalogue 20 chapitres)
 */

export const CHAPITRE_19_KEY = 'chapitre-19'
export const CHAPITRE_19_ORDER = 19

/** Détecte un chapitre Mongo correspondant au chapitre 19 figé. */
export function matchesChapitre19(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_19_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*19\b/i.test(name) || /^19([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-19/${n}.mp3`
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
    chapterKey: CHAPITRE_19_KEY,
    chapterOrder: CHAPITRE_19_ORDER,
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
export const CHAPITRE_19_QUESTIONS = [
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
