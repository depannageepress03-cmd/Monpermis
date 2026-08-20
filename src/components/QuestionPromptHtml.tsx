import { sanitizeCmsHtml } from '../utils/sanitizeHtml'

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function QuestionPromptHtml({
  text,
  className,
}: {
  text?: string | null
  className?: string
}) {
  const value = String(text || '').trim()
  if (!value) return null

  if (!looksLikeHtml(value)) {
    return <p className={className}>{value}</p>
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(value) }}
    />
  )
}
