export interface QuestionAnswer {
  id?: string
  label: string
  text: string
  audioUrl: string
  isCorrect: boolean
}

export interface QuestionPrompt {
  text: string
  audioUrl: string
  imageUrls: string[]
}

export interface ChapterQuestion {
  id: string
  chapterId: string
  order: number
  published: boolean
  prompt: QuestionPrompt
  answers: QuestionAnswer[]
  createdAt?: string
  updatedAt?: string
}

export interface QuestionPayload {
  prompt: QuestionPrompt
  answers: QuestionAnswer[]
  published?: boolean
}

export interface TestSubject {
  id: string
  chapterId: string
  published: boolean
  questionCount: number
  questions: ChapterQuestion[]
  createdAt?: string
  updatedAt?: string
}

export interface TestSubjectCurrent {
  chapter: { id: string; name: string }
  bankCount: number
  requiredCount: number
  subject: TestSubject | null
}
