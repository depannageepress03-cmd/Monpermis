/**
 * Banque questions en dur — Chapitre 7.
 * Audio : /content/code-audio/chapitre-7/{n}.mp3
 * Images : /content/code-images/chapitre-7/{n}.png
 * Mis à jour — 2026-08-20 (réponses + image Q4 B14).
 */

export const CHAPITRE_07_KEY = 'chapitre-7'
export const CHAPITRE_07_ORDER = 7

/** Détecte un chapitre Mongo correspondant au chapitre 7 figé. */
export function matchesChapitre07(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_07_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*7(?!\d)/i.test(name) || /^7([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-7/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-7/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([4])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch7-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch7-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_07_KEY,
    chapterOrder: CHAPITRE_07_ORDER,
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

/** 9 questions. */
export const CHAPITRE_07_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['A', 'C']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B'], ['B']),
  question(4, ['A', 'B', 'C', 'D', 'E'], ['D']),
  question(5, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(6, ['A', 'B', 'C'], ['B']),
  question(7, ['A', 'B', 'C'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['B']),
  question(9, ['A', 'B', 'C'], ['C']),
]
