/**
 * Banque questions en dur — Chapitre 8 (poids lourds / permis C-C1).
 * Audio : /content/code-audio/chapitre-8/{n}.mp3
 * Images : /content/code-images/chapitre-8/{n}.png
 * Textes corrigés / dédoublonnés — 2026-07-30.
 */

export const CHAPITRE_08_KEY = 'chapitre-8'
export const CHAPITRE_08_ORDER = 8

/** Détecte un chapitre Mongo correspondant au chapitre 8 figé. */
export function matchesChapitre08(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_08_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*8\b/i.test(name) || /^8([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-8/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-8/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([22, 23, 31, 32, 33, 34])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch8-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch8-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_08_KEY,
    chapterOrder: CHAPITRE_08_ORDER,
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
 * 41 questions — doublons / fragments OCR retirés.
 */
export const CHAPITRE_08_QUESTIONS = [
  question(1, ['A', 'B', 'C', 'D'], ['B']),
  question(2, ['A', 'B', 'C'], ['B']),
  question(3, ['A', 'B', 'C', 'D'], ['D']),
  question(4, ['A', 'B', 'C', 'D'], ['C']),
  question(5, ['A', 'B', 'C', 'D'], ['A']),
  question(6, ['A', 'B', 'C'], ['C']),
  question(7, ['A', 'B', 'C', 'D'], ['C']),
  question(8, ['A', 'B', 'C'], ['A', 'C']),
  question(9, ['A', 'B', 'C'], ['C']),
  question(10, ['A', 'B', 'C', 'D'], ['B']),
  question(11, ['A', 'B', 'C'], ['C']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C'], ['B']),
  question(14, ['A', 'B', 'C'], ['C']),
  question(15, ['A', 'B', 'C'], ['A']),
  question(16, ['A', 'B', 'C'], ['A']),
  question(17, ['A', 'B', 'C'], ['B']),
  question(18, ['A', 'B', 'C'], ['B', 'C']),
  question(19, ['A', 'B', 'C'], ['C']),
  question(20, ['A', 'B', 'C'], ['B', 'C']),
  question(21, ['A', 'B', 'C', 'D'], ['B']),
  question(22, ['A', 'B', 'C'], ['C']),
  question(23, ['A', 'B', 'C'], ['A', 'C']),
  question(24, ['A', 'B', 'C'], ['A']),
  question(25, ['A', 'B', 'C', 'D'], ['D']),
  question(26, ['A', 'B', 'C', 'D'], ['D']),
  question(27, ['A', 'B', 'C', 'D'], ['C']),
  question(28, ['A', 'B', 'C', 'D'], ['A']),
  question(29, ['A', 'B', 'C', 'D'], ['D']),
  question(30, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(31, ['A', 'B', 'C', 'D'], ['D']),
  question(32, ['A', 'B', 'C', 'D'], ['D']),
  question(33, ['A', 'B', 'C'], ['A']),
  question(34, ['A', 'B', 'C', 'D'], ['D']),
  question(35, ['A', 'B', 'C'], ['C']),
  question(36, ['A', 'B', 'C', 'D', 'E'], ['A', 'D', 'E']),
  question(37, ['A', 'B', 'C', 'D'], ['D']),
  question(38, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(39, ['A', 'B', 'C'], ['B']),
  question(40, ['A', 'B', 'C'], ['A', 'B']),
  question(41, ['A', 'B', 'C'], ['B', 'C']),
]
