/**
 * Banque questions en dur — Chapitre 11 (situations, marquage, priorités).
 * Audio : /content/code-audio/chapitre-11/{n}.mp3
 * 82 questions — 2026-08-19.
 *
 * Justes renseignées seulement quand la règle est générale (sans image).
 * Les questions de situation restent à compléter.
 */

export const CHAPITRE_11_KEY = 'chapitre-11'
export const CHAPITRE_11_ORDER = 11

/** Détecte un chapitre Mongo correspondant au chapitre 11 figé. */
export function matchesChapitre11(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_11_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*11\b/i.test(name) || /^11([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-11/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch11-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch11-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_11_KEY,
    chapterOrder: CHAPITRE_11_ORDER,
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

/** 82 questions — situations de conduite. */
export const CHAPITRE_11_QUESTIONS = [
  question(1, ['A', 'B'], []),
  question(2, ['A', 'B'], []),
  question(3, ['A', 'B'], []),
  question(4, ['A', 'B', 'C'], []),
  question(5, ['A', 'B'], []),
  question(6, ['A', 'B'], []),
  question(7, ['A', 'B'], []),
  question(8, ['A', 'B'], []),
  question(9, ['A', 'B'], []),
  question(10, ['A', 'B'], []),
  question(11, ['A', 'B'], []),
  question(12, ['A', 'B', 'C', 'D'], []),
  question(13, ['A', 'B'], []),
  question(14, ['A', 'B', 'C', 'D'], []),
  question(15, ['A', 'B', 'C', 'D'], []),
  question(16, ['A', 'B'], []),
  question(17, ['A', 'B'], []),
  question(18, ['A', 'B'], []),
  question(19, ['A', 'B'], []),
  question(20, ['A', 'B'], []),
  question(21, ['A', 'B', 'C', 'D'], []),
  question(22, ['A', 'B', 'C'], []),
  question(23, ['A', 'B', 'C', 'D'], []),
  question(24, ['A', 'B'], []),
  question(25, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(26, ['A', 'B', 'C', 'D'], []),
  question(27, ['A', 'B'], []),
  question(28, ['A', 'B', 'C'], []),
  question(29, ['A', 'B', 'C'], []),
  question(30, ['A', 'B'], []),
  question(31, ['A', 'B', 'C'], ['B']),
  question(32, ['A', 'B'], []),
  question(33, ['A', 'B'], []),
  question(34, ['A', 'B'], []),
  question(35, ['A', 'B'], []),
  question(36, ['A', 'B', 'C'], []),
  question(37, ['A', 'B', 'C', 'D'], []),
  question(38, ['A', 'B', 'C', 'D'], []),
  question(39, ['A', 'B', 'C', 'D'], []),
  question(40, ['A', 'B'], []),
  question(41, ['A', 'B'], []),
  question(42, ['A', 'B'], ['B']),
  question(43, ['A', 'B'], []),
  question(44, ['A', 'B'], []),
  question(45, ['A', 'B'], []),
  question(46, ['A', 'B', 'C'], []),
  question(47, ['A', 'B'], []),
  question(48, ['A', 'B'], []),
  question(49, ['A', 'B'], []),
  question(50, ['A', 'B', 'C'], []),
  question(51, ['A', 'B'], ['B']),
  question(52, ['A', 'B'], []),
  question(53, ['A', 'B'], []),
  question(54, ['A', 'B', 'C', 'D'], []),
  question(55, ['A', 'B'], []),
  question(56, ['A', 'B'], []),
  question(57, ['A', 'B', 'C', 'D'], []),
  question(58, ['A', 'B'], []),
  question(59, ['A', 'B'], []),
  question(60, ['A', 'B'], []),
  question(61, ['A', 'B'], []),
  question(62, ['A', 'B', 'C'], []),
  question(63, ['A', 'B'], ['A']),
  question(64, ['A', 'B'], []),
  question(65, ['A', 'B'], []),
  question(66, ['A', 'B'], []),
  question(67, ['A', 'B'], []),
  question(68, ['A', 'B'], []),
  question(69, ['A', 'B'], []),
  question(70, ['A', 'B'], []),
  question(71, ['A', 'B', 'C'], []),
  question(72, ['A', 'B'], []),
  question(73, ['A', 'B'], []),
  question(74, ['A', 'B'], []),
  question(75, ['A', 'B'], []),
  question(76, ['A', 'B', 'C', 'D'], []),
  question(77, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(78, ['A', 'B'], ['A']),
  question(79, ['A', 'B'], []),
  question(80, ['A', 'B', 'C', 'D'], []),
  question(81, ['A', 'B'], []),
  question(82, ['A', 'B', 'C', 'D'], []),
]
