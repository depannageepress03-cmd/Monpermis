/**
 * Banque questions en dur — Chapitre 13 (autoroute, priorités, signalisation).
 * Audio : /content/code-audio/chapitre-13/{n}.mp3
 * 95 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_13_KEY = 'chapitre-13'
export const CHAPITRE_13_ORDER = 13

/** Détecte un chapitre Mongo correspondant au chapitre 13 figé. */
export function matchesChapitre13(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_13_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*13\b/i.test(name) || /^13([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-13/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch13-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch13-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_13_KEY,
    chapterOrder: CHAPITRE_13_ORDER,
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

/** 95 questions — autoroute, priorités, signalisation. */
export const CHAPITRE_13_QUESTIONS = [
  question(1, ['A', 'B'], []),
  question(2, ['A', 'B'], []),
  question(3, ['A', 'B'], []),
  question(4, ['A', 'B'], []),
  question(5, ['A', 'B'], []),
  question(6, ['A', 'B', 'C'], []),
  question(7, ['A', 'B'], []),
  question(8, ['A', 'B'], []),
  question(9, ['A', 'B', 'C'], []),
  question(10, ['A', 'B'], []),
  question(11, ['A', 'B'], []),
  question(12, ['A', 'B'], []),
  question(13, ['A', 'B'], []),
  question(14, ['A', 'B'], ['B']),
  question(15, ['A', 'B'], []),
  question(16, ['A', 'B', 'C', 'D'], []),
  question(17, ['A', 'B', 'C'], []),
  question(18, ['A', 'B', 'C'], []),
  question(19, ['A', 'B'], ['B']),
  question(20, ['A', 'B', 'C'], ['A']),
  question(21, ['A', 'B'], []),
  question(22, ['A', 'B', 'C', 'D'], ['B']),
  question(23, ['A', 'B', 'C', 'D'], ['A']),
  question(24, ['A', 'B', 'C', 'D'], ['B']),
  question(25, ['A', 'B', 'C', 'D'], ['C']),
  question(26, ['A', 'B', 'C', 'D'], ['C']),
  question(27, ['A', 'B', 'C', 'D'], ['C']),
  question(28, ['A', 'B', 'C', 'D'], ['C']),
  question(29, ['A', 'B', 'C', 'D'], ['B']),
  question(30, ['A', 'B', 'C', 'D'], ['B']),
  question(31, ['A', 'B', 'C', 'D'], ['B']),
  question(32, ['A', 'B', 'C', 'D'], []),
  question(33, ['A', 'B', 'C'], ['C']),
  question(34, ['A', 'B', 'C', 'D'], ['C']),
  question(35, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(36, ['A', 'B', 'C', 'D'], ['B']),
  question(37, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(38, ['A', 'B', 'C'], ['C']),
  question(39, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(40, ['A', 'B', 'C'], ['B']),
  question(41, ['A', 'B', 'C'], ['C']),
  question(42, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(43, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(44, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(45, ['A', 'B', 'C'], ['C']),
  question(46, ['A', 'B', 'C', 'D'], ['B']),
  question(47, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(48, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(49, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(50, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(51, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(52, ['A', 'B'], ['B']),
  question(53, ['A', 'B', 'C'], ['C']),
  question(54, ['A', 'B', 'C'], ['A', 'C']),
  question(55, ['A', 'B', 'C'], ['B']),
  question(56, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']),
  question(57, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(58, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(59, ['A', 'B', 'C', 'D'], ['C']),
  question(60, ['A', 'B', 'C', 'D'], ['C']),
  question(61, ['A', 'B', 'C', 'D', 'E'], ['E']),
  question(62, ['A', 'B', 'C'], ['B']),
  question(63, ['A', 'B', 'C', 'D'], ['A']),
  question(64, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(65, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(66, ['A', 'B', 'C'], ['B']),
  question(67, ['A', 'B', 'C'], ['B']),
  question(68, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(69, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(70, ['A', 'B', 'C'], ['C']),
  question(71, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(72, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(73, ['A', 'B', 'C', 'D'], ['A']),
  question(74, ['A', 'B', 'C', 'D'], ['C']),
  question(75, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(76, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(77, ['A', 'B', 'C', 'D'], ['A']),
  question(78, ['A', 'B'], ['B']),
  question(79, ['A', 'B', 'C'], ['B']),
  question(80, ['A', 'B', 'C'], ['B']),
  question(81, ['A', 'B', 'C', 'D'], ['D']),
  question(82, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(83, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(84, ['A', 'B', 'C'], ['C']),
  question(85, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(86, ['A', 'B', 'C'], ['B', 'C']),
  question(87, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(88, ['A', 'B', 'C', 'D'], ['C']),
  question(89, ['A', 'B'], ['B']),
  question(90, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(91, ['A', 'B'], ['A', 'B']),
  question(92, ['A', 'B', 'C', 'D'], ['D']),
  question(93, ['A', 'B', 'C'], ['A', 'C']),
  question(94, ['A', 'B', 'C', 'D'], ['A']),
  question(95, ['A', 'B', 'C', 'D'], ['A', 'B']),
]
