/** Nombre d'examens blancs disponibles. */
export const PRACTICE_EXAM_COUNT = 24
/** Questions par examen (= note sur 20). */
export const PRACTICE_EXAM_SIZE = 20
/** Seuil de réussite. */
export const PRACTICE_EXAM_PASS_SCORE = 14

export function pickRandomQuestions(questions, count) {
  const pool = [...questions]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function scoreLabel(correct, total = PRACTICE_EXAM_SIZE) {
  return `${Number(correct) || 0}/${Number(total) || PRACTICE_EXAM_SIZE}`
}

export function isPracticeExamPassed(correct) {
  return Number(correct) >= PRACTICE_EXAM_PASS_SCORE
}
