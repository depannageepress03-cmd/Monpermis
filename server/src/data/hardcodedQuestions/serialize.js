/** Invalide le cache navigateur/CDN après un remplacement de MP3 au même chemin. */
export const CODE_MEDIA_VERSION = '20260821c'

function versioned(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.includes('v=')) return value
  const sep = value.includes('?') ? '&' : '?'
  return `${value}${sep}v=${CODE_MEDIA_VERSION}`
}

function versionedList(urls) {
  return (Array.isArray(urls) ? urls : []).map(versioned).filter(Boolean)
}

/** Sérialisation commune des questions hardcodées (public / admin). */

export function toPublicHardcodedQuestion(q, chapterId) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: versioned(q.prompt.audioUrl),
      imageUrls: versionedList(q.prompt.imageUrls),
    },
    answers: (q.answers || []).map((answer) => ({
      id: answer.id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: versioned(answer.audioUrl),
    })),
  }
}

export function toAdminHardcodedQuestion(q, chapterId) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    published: true,
    hardcoded: true,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: versioned(q.prompt.audioUrl),
      audioPublicId: '',
      imageUrls: versionedList(q.prompt.imageUrls),
    },
    answers: (q.answers || []).map((answer) => ({
      id: answer.id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: versioned(answer.audioUrl),
      isCorrect: Boolean(answer.isCorrect),
    })),
  }
}
