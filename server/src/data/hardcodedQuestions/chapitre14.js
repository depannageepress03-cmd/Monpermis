/**
 * Banque questions en dur — Chapitre 14 (véhicules lents, dimensions, comportement).
 * Audio : /content/code-audio/chapitre-14/{n}.mp3
 * 27 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_14_KEY = 'chapitre-14'
export const CHAPITRE_14_ORDER = 14

/** Détecte un chapitre Mongo correspondant au chapitre 14 figé. */
export function matchesChapitre14(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_14_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*14\b/i.test(name) || /^14([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-14/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch14-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch14-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_14_KEY,
    chapterOrder: CHAPITRE_14_ORDER,
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

/** 27 questions — véhicules lents, dimensions, comportement. */
export const CHAPITRE_14_QUESTIONS = [
  question(1, ['A', 'B', 'C'], []),
  question(2, ['A', 'B'], ['B']),
  question(3, ['A', 'B'], []),
  question(4, ['A', 'B', 'C'], []),
  question(5, ['A', 'B'], []),
  question(6, ['A', 'B', 'C', 'D'], ['B']),
  question(7, ['A', 'B', 'C', 'D'], ['C']),
  question(8, ['A', 'B', 'C', 'D'], []),
  question(9, ['A', 'B', 'C', 'D'], ['D']),
  question(10, ['A', 'B', 'C', 'D'], ['A']),
  question(11, ['A', 'B', 'C', 'D'], ['C']),
  question(12, ['A', 'B', 'C', 'D'], ['D']),
  question(13, ['A', 'B', 'C'], ['C']),
  question(14, ['A', 'B', 'C'], ['C']),
  question(15, ['A', 'B', 'C'], ['A']),
  question(16, ['A', 'B', 'C'], ['A']),
  question(17, ['A', 'B', 'C'], ['B', 'C']),
  question(18, ['A', 'B', 'C', 'D'], ['D']),
  question(19, ['A', 'B', 'C'], ['B']),
  question(20, ['A', 'B', 'C', 'D'], ['C']),
  question(21, ['A', 'B', 'C'], ['B']),
  question(22, ['A', 'B', 'C'], ['C']),
  question(23, ['A', 'B', 'C'], ['C']),
  question(24, ['A', 'B', 'C'], ['A', 'C']),
  question(25, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(26, ['A', 'B', 'C', 'D'], ['D']),
  question(27, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
]
