/**
 * Banque questions en dur — Chapitre 4 (conduite, virages, stationnement).
 * Audio : /content/code-audio/chapitre-4/{n}.mp3
 * Mis à jour — 2026-08-19.
 */

export const CHAPITRE_04_KEY = 'chapitre-4'
export const CHAPITRE_04_ORDER = 4

/** Détecte un chapitre Mongo correspondant au chapitre 4 figé. */
export function matchesChapitre04(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_04_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*4\b/i.test(name) || /^4([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-4/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch4-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch4-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_04_KEY,
    chapterOrder: CHAPITRE_04_ORDER,
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

/**
 * 30 questions — conduite, virages, stationnement.
 */
export const CHAPITRE_04_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['B']),
  question(2, ['A', 'B', 'C'], ['A', 'C']),
  question(3, ['A', 'B', 'C'], ['C']),
  question(4, ['A', 'B', 'C'], ['B']),
  question(5, ['A', 'B', 'C'], ['A']),
  question(6, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(7, ['A', 'B', 'C', 'D'], ['B']),
  question(8, ['A', 'B', 'C', 'D'], ['D']),
  question(9, ['A', 'B', 'C', 'D', 'E'], ['C']),
  question(10, ['A', 'B', 'C'], ['A', 'B']),
  question(11, ['A', 'B', 'C', 'D'], ['C']),
  question(12, ['A', 'B', 'C'], ['C']),
  question(13, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(14, ['A', 'B', 'C'], ['C']),
  question(15, ['A', 'B', 'C'], ['A', 'C']),
  question(16, ['A', 'B', 'C'], ['B']),
  question(17, ['A', 'B', 'C'], ['C']),
  question(18, ['A', 'B', 'C'], ['C']),
  question(19, ['A', 'B', 'C'], ['B']),
  question(20, ['A', 'B', 'C'], ['B']),
  question(21, ['A', 'B', 'C'], ['A']),
  question(22, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(23, ['A', 'B', 'C'], ['A', 'C']),
  question(24, ['A', 'B', 'C'], ['A']),
  question(25, ['A', 'B', 'C'], ['C']),
  question(26, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(27, ['A', 'B', 'C'], ['C']),
  question(28, ['A', 'B'], ['B']),
  question(29, ['A', 'B'], ['A']),
  question(30, ['A', 'B', 'C', 'D'], ['C']),
]
