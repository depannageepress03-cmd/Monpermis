export type LocalAnswer = {
  id: string
  label: string
  text: string
  audioUrl: string
  isCorrect: boolean
}

export type LocalQuestion = {
  id: string
  chapterKey: string
  chapterOrder: number
  order: number
  published: boolean
  prompt: { text: string; audioUrl: string; imageUrls: string[] }
  answers: LocalAnswer[]
}

function answers(
  chapterOrder: number,
  questionIndex: number,
  letters: string[],
  correctLetters: string[],
): LocalAnswer[] {
  const prefix = `hc-ch${chapterOrder}-q${String(questionIndex).padStart(2, '0')}`
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `${prefix}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(
  chapterOrder: number,
  order: number,
  letterOptions: string[],
  correctLetters: string[],
): LocalQuestion {
  const id = `hc-ch${chapterOrder}-q${String(order).padStart(2, '0')}`
  return {
    id,
    chapterKey: `chapitre-${chapterOrder}`,
    chapterOrder,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: `local://code-audio/${chapterOrder}/${order}.mp3`,
      imageUrls: [],
    },
    answers: answers(chapterOrder, order, letterOptions, correctLetters),
  }
}

const CHAPITRE_16: LocalQuestion[] = [
  question(16, 1, ['A', 'B', 'C'], ['A']),
  question(16, 2, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(16, 3, ['A', 'B'], ['A']),
  question(16, 4, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(16, 5, ['A', 'B'], ['A']),
  question(16, 6, ['A', 'B'], ['A']),
  question(16, 7, ['A', 'B', 'C'], ['A']),
  question(16, 8, ['A', 'B', 'C', 'D'], ['B', 'D']),
  question(16, 9, ['A', 'B', 'C', 'D'], ['B']),
  question(16, 10, ['A', 'B', 'C', 'D'], ['A']),
  question(16, 11, ['A', 'B', 'C', 'D'], ['B']),
  question(16, 12, ['A', 'B', 'C', 'D'], ['B']),
  question(16, 13, ['A', 'B', 'C', 'D'], ['C']),
  question(16, 14, ['A', 'B', 'C', 'D'], ['B', 'C', 'D']),
  question(16, 15, ['A', 'B', 'C', 'D'], ['D']),
  question(16, 16, ['A', 'B', 'C', 'D'], ['C']),
  question(16, 17, ['A', 'B', 'C', 'D'], ['C']),
  question(16, 18, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(16, 19, ['A', 'B', 'C'], ['B']),
  question(16, 20, ['A', 'B', 'C', 'D'], ['C']),
  question(16, 21, ['A', 'B', 'C', 'D'], ['C', 'D']),
  question(16, 22, ['A', 'B', 'C'], ['B']),
  question(16, 23, ['A', 'B', 'C'], ['B']),
]

const CHAPITRE_18: LocalQuestion[] = [
  question(18, 1, ['A', 'B', 'C'], ['A', 'B']),
  question(18, 2, ['A', 'B'], ['B']),
  question(18, 3, ['A', 'B'], ['B']),
  question(18, 4, ['A', 'B'], ['A']),
  question(18, 5, ['A', 'B', 'C'], ['C']),
  question(18, 6, ['A', 'B', 'C'], ['B']),
  question(18, 7, ['A', 'B', 'C', 'D'], ['A']),
  question(18, 8, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(18, 9, ['A', 'B', 'C'], ['A']),
  question(18, 10, ['A', 'B', 'C', 'D'], ['B']),
  question(18, 11, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(18, 12, ['A', 'B', 'C'], ['A', 'B']),
  question(18, 13, ['A', 'B', 'C', 'D'], ['C']),
  question(18, 14, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(18, 15, ['A', 'B', 'C', 'D'], ['A']),
  question(18, 16, ['A', 'B', 'C', 'D'], ['D']),
  question(18, 17, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(18, 18, ['A', 'B', 'C'], ['C']),
  question(18, 19, ['A', 'B', 'C'], ['C']),
  question(18, 20, ['A', 'B', 'C'], ['A', 'C']),
  question(18, 21, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(18, 22, ['A', 'B', 'C'], ['A']),
  question(18, 23, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(18, 24, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(18, 25, ['A', 'B', 'C'], ['A']),
  question(18, 26, ['A', 'B', 'C'], ['C']),
]

const CHAPITRE_19: LocalQuestion[] = [
  question(19, 1, ['A', 'B', 'C'], ['A', 'B']),
  question(19, 2, ['A', 'B'], ['B']),
  question(19, 3, ['A', 'B'], ['B']),
  question(19, 4, ['A', 'B'], ['A']),
  question(19, 5, ['A', 'B', 'C'], ['C']),
  question(19, 6, ['A', 'B', 'C'], ['B']),
  question(19, 7, ['A', 'B', 'C', 'D'], ['A']),
  question(19, 8, ['A', 'B', 'C', 'D'], ['A', 'B', 'D']),
  question(19, 9, ['A', 'B', 'C'], ['A']),
  question(19, 10, ['A', 'B', 'C', 'D'], ['B']),
  question(19, 11, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(19, 12, ['A', 'B', 'C'], ['A', 'B']),
  question(19, 13, ['A', 'B', 'C', 'D'], ['C']),
  question(19, 14, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(19, 15, ['A', 'B', 'C', 'D'], ['A']),
  question(19, 16, ['A', 'B', 'C', 'D'], ['D']),
  question(19, 17, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(19, 18, ['A', 'B', 'C'], ['C']),
  question(19, 19, ['A', 'B', 'C'], ['C']),
  question(19, 20, ['A', 'B', 'C'], ['A', 'C']),
  question(19, 21, ['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
  question(19, 22, ['A', 'B', 'C'], ['A']),
  question(19, 23, ['A', 'B', 'C', 'D'], ['A', 'B']),
  question(19, 24, ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']),
  question(19, 25, ['A', 'B', 'C'], ['A']),
  question(19, 26, ['A', 'B', 'C'], ['C']),
]

const CHAPITRE_20: LocalQuestion[] = [
  question(20, 1, ['A', 'B'], ['B']),
  question(20, 2, ['A', 'B', 'C'], ['A']),
  question(20, 3, ['A', 'B', 'C'], ['C']),
  question(20, 4, ['A', 'B', 'C', 'D'], ['A']),
  question(20, 5, ['A', 'B', 'C', 'D'], ['C']),
]

const CHAPITRE_21: LocalQuestion[] = [
  question(21, 1, ['A', 'B'], ['B']),
  question(21, 2, ['A', 'B', 'C', 'D'], ['A', 'C']),
  question(21, 3, ['A', 'B', 'C', 'D'], ['C']),
  question(21, 4, ['A', 'B', 'C', 'D'], ['B']),
  question(21, 5, ['A', 'B', 'C', 'D'], ['B']),
  question(21, 6, ['A', 'B', 'C', 'D'], ['B', 'C']),
  question(21, 7, ['A', 'B', 'C'], ['A', 'C']),
  question(21, 8, ['A', 'B', 'C'], ['B']),
  question(21, 9, ['A', 'B', 'C'], ['A', 'B', 'C']),
  question(21, 10, ['A', 'B', 'C'], ['A']),
]

const BANKS_BY_ORDER: Record<number, LocalQuestion[]> = {
  16: CHAPITRE_16,
  18: CHAPITRE_18,
  19: CHAPITRE_19,
  20: CHAPITRE_20,
  21: CHAPITRE_21,
}

export function getLocalBankByChapterOrder(order: number): LocalQuestion[] | null {
  return BANKS_BY_ORDER[order] || null
}

export function findLocalQuestionById(questionId: string): LocalQuestion | null {
  const id = String(questionId || '')
  for (const bank of Object.values(BANKS_BY_ORDER)) {
    const found = bank.find((q) => q.id === id)
    if (found) return found
  }
  return null
}

export function parseLocalQuestionId(questionId: string): { chapterOrder: number; questionOrder: number } | null {
  const m = String(questionId || '').match(/^hc-ch(\d+)-q(\d+)$/i)
  if (!m) return null
  return { chapterOrder: Number(m[1]), questionOrder: Number(m[2]) }
}

export function toPublicLocalQuestion(q: LocalQuestion, chapterId: string) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: q.prompt.audioUrl,
      imageUrls: q.prompt.imageUrls || [],
    },
    answers: q.answers.map((a) => ({
      id: a.id,
      label: a.label,
      text: a.text || '',
      audioUrl: a.audioUrl || '',
    })),
  }
}

export function checkLocalAnswers(questionId: string, answerIds: string[]) {
  const question = findLocalQuestionById(questionId)
  if (!question) return null
  const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id))
  const selectedIds = new Set((answerIds || []).map(String))
  const isCorrect =
    correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id))
  return { isCorrect, correctAnswerIds: [...correctIds] }
}
