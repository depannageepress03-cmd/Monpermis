const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildCourseContext({ chapterName, courseTitle, modules }) {
  const parts = [
    `Chapitre : ${chapterName || '—'}`,
    `Cours : ${courseTitle || '—'}`,
    '',
    'Contenu du cours :',
  ]

  for (const [index, module] of (modules || []).entries()) {
    const title = stripHtml(module.title || module.name || `Module ${index + 1}`)
    const text = stripHtml(module.text || '')
    parts.push(`--- Module ${index + 1} : ${title}`)
    parts.push(text || '(pas de texte)')
    parts.push('')
  }

  return parts.join('\n').slice(0, 24000)
}

export function buildTutorSystemPrompt(courseContext) {
  return [
    'Tu es le tuteur IA de Monpermis.bj, auto-école au Bénin.',
    'Tu aides l’élève à comprendre UNIQUEMENT le cours de code de la route fourni ci-dessous.',
    'Réponds en français, clairement, de façon pédagogique et concise.',
    'Si la question sort du cours, dis-le poliment et recentre sur le contenu du cours.',
    'Ne donne pas de conseils dangereux ni de réponses hors sujet.',
    '',
    courseContext,
  ].join('\n')
}

/**
 * Appelle l’API Messages Anthropic.
 * @param {{ system: string, messages: { role: string, content: string }[], model?: string }} params
 */
export async function createTutorReply({ system, messages, model }) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    const error = new Error('ANTHROPIC_API_KEY manquante sur le serveur')
    error.status = 503
    throw error
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body?.error?.message || body?.error || `Erreur Anthropic (${response.status})`
    const error = new Error(typeof detail === 'string' ? detail : 'Erreur Anthropic')
    error.status = response.status >= 500 ? 502 : 400
    throw error
  }

  const text = (body.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!text) {
    const error = new Error('Réponse IA vide')
    error.status = 502
    throw error
  }

  return text
}
