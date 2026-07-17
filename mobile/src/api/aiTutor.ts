import { getStoredToken } from './auth'
import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
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
  const token = await getStoredToken()
  if (!token) throw new AiTutorError('Authentification requise')

  let response: Response
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    })
  } catch {
    throw new AiTutorError('Impossible de joindre le serveur')
  }

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
