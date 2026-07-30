import {
  getLocalBankByChapterOrder,
  toPublicLocalQuestion,
  type LocalQuestion,
} from './banks'

const TEST_SUBJECT_SIZE = 20

function computeSubjectCount(publishedCount: number) {
  const n = Math.max(0, Number(publishedCount) || 0)
  if (n <= 0) return 0
  if (n < TEST_SUBJECT_SIZE) return 1
  return Math.floor(n / 5)
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(parts: string[]) {
  const text = parts.join('|')
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickQuestions(questions: LocalQuestion[], subjectNumber: number, chapterId: string) {
  const pool = [...questions]
  const count = Math.min(TEST_SUBJECT_SIZE, pool.length)
  if (count <= 0) return []

  const ids = pool
    .map((q) => q.id)
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

export function buildLocalSubjectSummaries(chapterOrder: number, chapterId: string) {
  const bank = getLocalBankByChapterOrder(chapterOrder)
  if (!bank?.length) {
    return {
      publishedCount: 0,
      questionsPerSubject: 0,
      subjects: [] as { number: number; id: string; label: string; questionCount: number }[],
    }
  }
  const publishedCount = bank.length
  const subjectCount = computeSubjectCount(publishedCount)
  const questionsPerSubject = Math.min(TEST_SUBJECT_SIZE, publishedCount)
  return {
    publishedCount,
    questionsPerSubject,
    subjects: Array.from({ length: subjectCount }, (_, index) => {
      const number = index + 1
      return {
        number,
        id: `${chapterId}-sujet-${number}`,
        label: `Sujet ${number}`,
        questionCount: questionsPerSubject,
      }
    }),
  }
}

export function buildLocalSubject(
  chapterOrder: number,
  chapterId: string,
  subjectNumber: number,
) {
  const bank = getLocalBankByChapterOrder(chapterOrder)
  if (!bank?.length) return null
  const summaries = buildLocalSubjectSummaries(chapterOrder, chapterId)
  const summary = summaries.subjects.find((s) => s.number === subjectNumber)
  if (!summary) return null
  const selected = pickQuestions(bank, subjectNumber, chapterId)
  return {
    number: summary.number,
    label: summary.label,
    questions: selected.map((q) => toPublicLocalQuestion(q, chapterId)),
  }
}
