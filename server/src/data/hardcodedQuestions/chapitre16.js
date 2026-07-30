/**
 * Banque questions en dur — Chapitre 16.
 * Audio : /content/code-audio/chapitre-16/{n}.mp3
 * Images : /content/code-images/chapitre-16/{n}.png (n = n° question)
 * Corrections / textes fournis 2026-07-30.
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

function imageUrl(n) {
  return `/content/code-images/chapitre-16/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 2, 3, 8])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch16-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch16-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_16_KEY,
    chapterOrder: CHAPITRE_16_ORDER,
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
 * 28 questions.
 * Corrections / reformulations 2026-07-30.
 */
export const CHAPITRE_16_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['A']),
  question(2, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(3, ['A', 'B'], ['A']),
  question(4, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(5, ['A', 'B'], ['A']),
  question(6, ['A', 'B'], ['A']),
  question(7, ['A', 'B', 'C'], ['C']),
  question(8, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(9, ['A', 'B', 'C', 'D'], ['B']),
  question(10, ['A', 'B', 'C', 'D'], ['B']),
  question(11, ['A', 'B', 'C', 'D'], ['B']),
  question(12, ['A', 'B', 'C', 'D'], ['B']),
  question(13, ['A', 'B', 'C', 'D'], ['C']),
  question(14, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(15, ['A', 'B', 'C', 'D'], ['D']),
  question(16, ['A', 'B', 'C', 'D'], ['C']),
  question(17, ['A', 'B', 'C', 'D'], ['A']),
  question(18, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(19, ['A', 'B', 'C'], ['B']),
  question(20, ['A', 'B', 'C', 'D'], ['C']),
  question(21, ['A', 'B', 'C', 'D'], ['C']),
  question(22, ['A', 'B', 'C'], ['B']),
  question(23, ['A', 'B', 'C'], ['B']),
  question(24, ['A', 'B', 'C', 'D'], ['B']),
  question(25, ['A', 'B', 'C', 'D'], ['B']),
  question(26, ['A', 'B', 'C', 'D'], ['B']),
  question(27, ['A', 'B', 'C', 'D'], ['B']),
  question(28, ['A', 'B', 'C', 'D'], ['C']),
]
