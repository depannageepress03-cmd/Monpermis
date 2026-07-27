export interface QuestionAnswer {
  id?: string
  label: string
  text: string
  audioUrl: string
  isCorrect: boolean
}

export interface QuestionPrompt {
  text: string
  /** Cloudinary secure_url (ou ancien /uploads/... le temps de migration). */
  audioUrl: string
  /** Cloudinary public_id — jamais le secret API. */
  audioPublicId?: string
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

export interface TestSubjectSummary {
  number: number
  id: string
  label: string
  questionCount: number
}

export interface TestSubjectCurrent {
  chapter: { id: string; name: string }
  bankCount: number
  publishedCount?: number
  requiredCount: number
  subjectCount?: number
  autoSubjects?: boolean
  subjects?: TestSubjectSummary[]
  subject: TestSubject | null
}
