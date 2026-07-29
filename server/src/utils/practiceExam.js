import {
  pickChapterBalancedQuestions,
  pickRandomQuestions,
  computeQuestionBankFingerprint,
  summarizeChapterBank,
} from './chapterBalancedPick.js'

/** Nombre d'examens blancs (sujets de test) disponibles. */
export const PRACTICE_EXAM_COUNT = 24
/** Questions par examen (= note sur 20). */
export const PRACTICE_EXAM_SIZE = 20
/** Seuil de réussite. */
export const PRACTICE_EXAM_PASS_SCORE = 14

export {
  pickChapterBalancedQuestions,
  pickRandomQuestions,
  computeQuestionBankFingerprint,
  summarizeChapterBank,
}

export function scoreLabel(correct, total = PRACTICE_EXAM_SIZE) {
  return `${Number(correct) || 0}/${Number(total) || PRACTICE_EXAM_SIZE}`
}

export function isPracticeExamPassed(correct) {
  return Number(correct) >= PRACTICE_EXAM_PASS_SCORE
}
