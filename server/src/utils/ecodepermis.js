/** Nombre d'épreuves E-Codepermis disponibles. */
export const ECODEPERMIS_EXAM_COUNT = 30
/** Questions par épreuve (= note sur 20, conditions réelles). */
export const ECODEPERMIS_EXAM_SIZE = 20
/** Seuil de réussite. */
export const ECODEPERMIS_EXAM_PASS_SCORE = 14

export function pickRandomQuestions(questions, count) {
  const pool = [...questions]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function scoreLabel(correct, total = ECODEPERMIS_EXAM_SIZE) {
  return `${Number(correct) || 0}/${Number(total) || ECODEPERMIS_EXAM_SIZE}`
}

export function isECodePermisExamPassed(correct) {
  return Number(correct) >= ECODEPERMIS_EXAM_PASS_SCORE
}
