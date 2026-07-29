/** Sérialisation commune des questions hardcodées (public / admin). */

export function toPublicHardcodedQuestion(q, chapterId) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: q.prompt.audioUrl || '',
      imageUrls: Array.isArray(q.prompt.imageUrls) ? q.prompt.imageUrls : [],
    },
    answers: (q.answers || []).map((answer) => ({
      id: answer.id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: answer.audioUrl || '',
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
      audioUrl: q.prompt.audioUrl || '',
      audioPublicId: '',
      imageUrls: Array.isArray(q.prompt.imageUrls) ? q.prompt.imageUrls : [],
    },
    answers: (q.answers || []).map((answer) => ({
      id: answer.id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: answer.audioUrl || '',
      isCorrect: Boolean(answer.isCorrect),
    })),
  }
}
