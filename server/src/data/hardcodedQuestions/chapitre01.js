/**
 * Banque questions en dur — Chapitre 1 (signalisation) — parties 1+2.
 * Audio : /content/code-audio/chapitre-1/{n}.mp3
 * Images : /content/code-images/chapitre-1/{n}.png
 * Mis à jour — 2026-07-31.
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
const QUESTIONS_WITH_IMAGES = new Set([3, 4, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 33, 36, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 63, 64, 66, 68, 70, 71, 72, 73, 74, 76, 77, 78, 80, 81, 96, 97, 98, 99, 100, 101, 102, 104, 106])

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
 * 106 questions — parties 1+2 (doublons OCR retirés).
 * Images panneaux sur les questions concernées.
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
  question(17, ['A', 'B', 'C'], ['B']),
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
  question(43, ['A', 'B', 'C', 'D'], ['D']),
  question(44, ['A', 'B', 'C', 'D'], ['A']),
  question(45, ['A', 'B', 'C'], ['C']),
  question(46, ['A', 'B', 'C'], ['B']),
  question(47, ['A', 'B', 'C'], ['C']),
  question(48, ['A', 'B', 'C'], ['C']),
  question(49, ['A', 'B', 'C'], ['B']),
  question(50, ['A', 'B', 'C'], ['A']),
  question(51, ['A', 'B', 'C'], ['A']),
  question(52, ['A', 'B', 'C'], ['C']),
  question(53, ['A', 'B', 'C'], ['B']),
  question(54, ['A', 'B', 'C', 'D'], ['A']),
  question(55, ['A', 'B', 'C', 'D'], ['D']),
  question(56, ['A', 'B', 'C', 'D'], ['D']),
  question(57, ['A', 'B', 'C', 'D'], ['B']),
  question(58, ['A', 'B', 'C', 'D'], ['C']),
  question(59, ['A', 'B', 'C'], ['C']),
  question(60, ['A', 'B', 'C', 'D'], ['D']),
  question(61, ['A', 'B', 'C'], ['C']),
  question(62, ['A', 'B', 'C'], ['C']),
  question(63, ['A', 'B', 'C'], ['C']),
  question(64, ['A', 'B', 'C', 'D'], ['C']),
  question(65, ['A', 'B', 'C', 'D'], ['D']),
  question(66, ['A', 'B', 'C'], ['C']),
  question(67, ['A', 'B', 'C'], ['A']),
  question(68, ['A', 'B', 'C'], ['B']),
  question(69, ['A', 'B', 'C'], ['C']),
  question(70, ['A', 'B', 'C'], ['B']),
  question(71, ['A', 'B', 'C', 'D'], ['B']),
  question(72, ['A', 'B', 'C', 'D'], ['D']),
  question(73, ['A', 'B', 'C', 'D'], ['A']),
  question(74, ['A', 'B', 'C'], ['A', 'C']),
  question(75, ['A', 'B', 'C'], ['B']),
  question(76, ['A', 'B', 'C'], ['C']),
  question(77, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(78, ['A', 'B', 'C'], ['C']),
  question(79, ['A', 'B', 'C'], ['C']),
  question(80, ['A', 'B', 'C'], ['C']),
  question(81, ['A', 'B', 'C'], ['C']),
  question(82, ['A', 'B', 'C'], ['A']),
  question(83, ['A', 'B', 'C'], ['C']),
  question(84, ['A', 'B', 'C'], ['A']),
  question(85, ['A', 'B', 'C'], ['C']),
  question(86, ['A', 'B', 'C'], ['C']),
  question(87, ['A', 'B', 'C'], ['C']),
  question(88, ['A', 'B', 'C'], ['B']),
  question(89, ['A', 'B', 'C'], ['C']),
  question(90, ['A', 'B', 'C'], ['B']),
  question(91, ['A', 'B', 'C', 'D'], ['C']),
  question(92, ['A', 'B', 'C', 'D'], ['B']),
  question(93, ['A', 'B', 'C', 'D'], ['D']),
  question(94, ['A', 'B', 'C'], ['C']),
  question(95, ['A', 'B', 'C', 'D'], ['C']),
  question(96, ['A', 'B', 'C'], ['A']),
  question(97, ['A', 'B', 'C'], ['C']),
  question(98, ['A', 'B', 'C'], ['B']),
  question(99, ['A', 'B', 'C'], ['C']),
  question(100, ['A', 'B', 'C'], ['B']),
  question(101, ['A', 'B', 'C'], ['B']),
  question(102, ['A', 'B', 'C', 'D', 'E'], ['C']),
  question(103, ['A', 'B', 'C', 'D'], ['A', 'D']),
  question(104, ['A', 'B', 'C', 'D'], ['D']),
  question(105, ['A', 'B', 'C', 'D'], ['B']),
  question(106, ['A', 'B', 'C'], ['A']),
]
