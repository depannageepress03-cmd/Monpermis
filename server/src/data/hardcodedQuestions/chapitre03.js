/**
 * Banque questions en dur — Chapitre 3.
 * Audio : /content/code-audio/chapitre-3/{n}.mp3
 * Images : /content/code-images/chapitre-3/{n}.png (n = n° question)
 * Textes corrigés + remplacements Q1/Q9/Q26 — 2026-07-30.
 */

export const CHAPITRE_03_KEY = 'chapitre-3'
export const CHAPITRE_03_ORDER = 3

/** Détecte un chapitre Mongo correspondant au chapitre 3 figé. */
export function matchesChapitre03(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_03_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*3\b/i.test(name) || /^3([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-3/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-3/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([2, 6, 8])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch3-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch3-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_03_KEY,
    chapterOrder: CHAPITRE_03_ORDER,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: answers(order, letterOptions, correctLetters),
  }
}

/**
 * 42 questions.
 * Q1 / Q9 / Q26 remplacées (énoncés ambigus ou image-dépendants).
 */
export const CHAPITRE_03_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['A']),
  question(2, ['A', 'B', 'C', 'D'], ['A']),
  question(3, ['A', 'B', 'C'], ['B']),
  question(4, ['A', 'B', 'C'], ['B']),
  question(5, ['A', 'B', 'C'], ['C']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C', 'D'], ['C']),
  question(8, ['A', 'B', 'C'], ['B']),
  question(9, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(10, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(11, ['A', 'B', 'C'], ['A', 'C']),
  question(12, ['A', 'B', 'C'], ['A', 'B']),
  question(13, ['A', 'B', 'C', 'D', 'E'], ['A', 'C', 'E']),
  question(14, ['A', 'B', 'C'], ['A', 'B']),
  question(15, ['A', 'B', 'C'], ['B']),
  question(16, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E']),
  question(17, ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E']),
  question(18, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(19, ['A', 'B', 'C'], ['A']),
  question(20, ['A', 'B', 'C'], ['B', 'C']),
  question(21, ['A', 'B', 'C'], ['C']),
  question(22, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(23, ['A', 'B', 'C'], ['C']),
  question(24, ['A', 'B', 'C', 'D'], ['A']),
  question(25, ['A', 'B', 'C'], ['A', 'B']),
  question(26, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(27, ['A', 'B'], ['A', 'B']),
  question(28, ['A', 'B', 'C'], ['B']),
  question(29, ['A', 'B', 'C'], ['B']),
  question(30, ['A', 'B', 'C'], ['A', 'B']),
  question(31, ['A', 'B', 'C'], ['C']),
  question(32, ['A', 'B'], ['A', 'B']),
  question(33, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(34, ['A', 'B', 'C', 'D', 'E'], ['C', 'D', 'E']),
  question(35, ['A', 'B'], ['B']),
  question(36, ['A', 'B'], ['A']),
  question(37, ['A', 'B', 'C'], ['B']),
  question(38, ['A', 'B', 'C'], ['A']),
  question(39, ['A', 'B', 'C'], ['C']),
  question(40, ['A', 'B', 'C'], ['C']),
  question(41, ['A', 'B'], ['B']),
  question(42, ['A', 'B', 'C'], ['A', 'B', 'C']),
]
