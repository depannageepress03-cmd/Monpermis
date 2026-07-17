import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

export class AiTutorError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AiTutorError'
    this.code = code
  }
}

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new AiTutorError('Authentification requise')

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new AiTutorError(body.error ?? 'Chat IA indisponible', body.code)
  }
  return body.data
}

export function sendCourseTutorMessage(params: {
  chapterId: string
  courseId: string
  messages: AiChatMessage[]
}) {
  return request<{ message: AiChatMessage }>('/ai/tutor/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
