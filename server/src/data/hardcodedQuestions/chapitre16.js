/**
 * Banque questions en dur — Chapitre 16.
 * Audio : /content/code-audio/chapitre-16/{n}.mp3
 * (anciennement chapitre 17 — décalage catalogue 20 chapitres)
 */

export const CHAPITRE_16_KEY = 'chapitre-16'
export const CHAPITRE_16_ORDER = 16

/** Détecte un chapitre Mongo correspondant au chapitre 16 figé. */
export function matchesChapitre16(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_16_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*16\b/i.test(name) || /^16([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-16/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch17-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch17-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_16_KEY,
    chapterOrder: CHAPITRE_16_ORDER,
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

/** 15 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_16_QUESTIONS = [
  question(1, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B', 'C', 'D'], ['C']),
  question(4, ['A', 'B', 'C', 'D'], ['C']),
  question(5, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(6, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(7, ['A', 'B'], ['A']),
  question(8, ['A', 'B', 'C', 'D'], ['D']),
  question(9, ['A', 'B', 'C'], ['C']),
  question(10, ['A', 'B', 'C'], ['B']),
  question(11, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(12, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(13, ['A', 'B', 'C', 'D'], ['C']),
  question(14, ['A', 'B', 'C'], ['A']),
  question(15, ['A', 'B', 'C', 'D'], ['A', 'C']),
]
