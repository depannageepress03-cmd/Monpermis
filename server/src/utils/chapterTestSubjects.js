import { TEST_SUBJECT_SIZE } from '../models/TestSubject.js'

/**
 * Nombre de sujets test affichés selon la banque publiée.
 * Ex. 20 Q → 4 sujets, 25 Q → 5, 29 Q → 5, 30 Q → 6.
 * En dessous de 20 questions publiées : 1 seul sujet (toutes les questions).
 */
export function computeChapterTestSubjectCount(publishedCount) {
  const n = Math.max(0, Number(publishedCount) || 0)
  if (n <= 0) return 0
  if (n < TEST_SUBJECT_SIZE) return 1
  return Math.floor(n / 5)
}

/** PRNG déterministe (mulberry32) pour un sujet stable et distinct. */
function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(parts) {
  const text = parts.join('|')
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Tirage déterministe : Sujet 1 ≠ Sujet 2.
 * Le contenu change quand la banque de questions publiées change.
 */
export function pickQuestionsForSubject(questions, subjectNumber, chapterId) {
  const pool = [...questions]
  const count = Math.min(TEST_SUBJECT_SIZE, pool.length)
  if (count <= 0) return []

  const ids = pool
    .map((q) => String(q._id || q.id || ''))
    .sort()
    .join(',')
  const seed = hashSeed([String(chapterId), String(subjectNumber), ids])
  const rand = mulberry32(seed)

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, count)
}

export function buildSubjectSummaries(publishedCount, chapterId) {
  const subjectCount = computeChapterTestSubjectCount(publishedCount)
  const questionsPerSubject = Math.min(TEST_SUBJECT_SIZE, publishedCount)
  return Array.from({ length: subjectCount }, (_, index) => {
    const number = index + 1
    return {
      number,
      id: `${chapterId}-sujet-${number}`,
      label: `Sujet ${number}`,
      questionCount: questionsPerSubject,
    }
  })
}

export { TEST_SUBJECT_SIZE }
