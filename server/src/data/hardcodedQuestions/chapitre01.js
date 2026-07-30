/**
 * Banque questions en dur — Chapitre 1 (signalisation) — partie 1.
 * Audio : /content/code-audio/chapitre-1/{n}.mp3
 * Images : /content/code-images/chapitre-1/{n}.png
 * Suite à venir — 2026-07-30.
 */

export const CHAPITRE_01_KEY = 'chapitre-1'
export const CHAPITRE_01_ORDER = 1

/** Détecte un chapitre Mongo correspondant au chapitre 1 figé. */
export function matchesChapitre01(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_01_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*1\b/i.test(name) || /^1([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-1/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-1/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([3, 4, 6, 14, 15, 16, 18, 19, 20, 22, 33, 36])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch1-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch1-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_01_KEY,
    chapterOrder: CHAPITRE_01_ORDER,
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
 * 42 questions — 1re partie (doublons OCR retirés).
 * Images : 3,4,6,14,15,16,18,19,20,22,33,36.
 */
export const CHAPITRE_01_QUESTIONS = [
  question(1, ['A', 'B', 'C'], ['B']),
  question(2, ['A', 'B', 'C'], ['C']),
  question(3, ['A', 'B', 'C'], ['A']),
  question(4, ['A', 'B', 'C'], ['C']),
  question(5, ['A', 'B', 'C'], ['B']),
  question(6, ['A', 'B', 'C'], ['C']),
  question(7, ['A', 'B', 'C'], ['B']),
  question(8, ['A', 'B', 'C'], ['B']),
  question(9, ['A', 'B', 'C'], ['B', 'C']),
  question(10, ['A', 'B', 'C'], ['A']),
  question(11, ['A', 'B', 'C', 'D'], ['D']),
  question(12, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(13, ['A', 'B', 'C'], ['A']),
  question(14, ['A', 'B', 'C', 'D'], ['D']),
  question(15, ['A', 'B', 'C'], ['B']),
  question(16, ['A', 'B', 'C', 'D'], ['D']),
  question(17, ['A', 'B', 'C'], ['C']),
  question(18, ['A', 'B', 'C', 'D'], ['B']),
  question(19, ['A', 'B', 'C'], ['C']),
  question(20, ['A', 'B', 'C'], ['B']),
  question(21, ['A', 'B', 'C', 'D'], ['D']),
  question(22, ['A', 'B', 'C', 'D'], ['D']),
  question(23, ['A', 'B'], ['B']),
  question(24, ['A', 'B', 'C', 'D'], ['A']),
  question(25, ['A', 'B', 'C', 'D'], ['C']),
  question(26, ['A', 'B', 'C', 'D'], ['C']),
  question(27, ['A', 'B', 'C'], ['C']),
  question(28, ['A', 'B', 'C'], ['B']),
  question(29, ['A', 'B', 'C', 'D'], ['D']),
  question(30, ['A', 'B', 'C'], ['C']),
  question(31, ['A', 'B', 'C'], ['B']),
  question(32, ['A', 'B', 'C'], ['A']),
  question(33, ['A', 'B', 'C'], ['A']),
  question(34, ['A', 'B', 'C'], ['B']),
  question(35, ['A', 'B', 'C'], ['C']),
  question(36, ['A', 'B', 'C'], ['A']),
  question(37, ['A', 'B', 'C'], ['C']),
  question(38, ['A', 'B', 'C'], ['C']),
  question(39, ['A', 'B', 'C'], ['B']),
  question(40, ['A', 'B', 'C'], ['B']),
  question(41, ['A', 'B', 'C', 'D'], ['D']),
  question(42, ['A', 'B', 'C', 'D'], ['A']),
]
