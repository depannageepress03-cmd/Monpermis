import { stripHtml } from './richText'

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 o'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

export function estimateTextBytes(text: string): number {
  return new TextEncoder().encode(stripHtml(text)).length
}

export function describeModuleSize(input: {
  text: string
  mediaType: '' | 'video' | 'image'
  videoUrl: string
  imageUrl: string
  mediaBytes: number
}): { label: string; detail: string; warning: boolean } {
  const plain = stripHtml(input.text)
  const textBytes = estimateTextBytes(input.text)
  const parts: string[] = []

  if (plain) {
    parts.push(`Texte ${plain.length} car. (~${formatBytes(textBytes)})`)
  }

  if (input.mediaType === 'video' && input.videoUrl.trim()) {
    parts.push('Vidéo (lien externe)')
  }

  if (input.mediaType === 'image' && input.imageUrl.trim()) {
    parts.push(
      input.mediaBytes > 0
        ? `Photo ${formatBytes(input.mediaBytes)}`
        : 'Photo ajoutée',
    )
  }

  if (parts.length === 0) {
    return {
      label: 'Module vide',
      detail: 'Ajoutez un titre, un média ou du texte',
      warning: false,
    }
  }

  const totalKnown = textBytes + (input.mediaType === 'image' ? input.mediaBytes : 0)
  const warning = input.mediaType === 'image' && input.mediaBytes > 2 * 1024 * 1024

  return {
    label: totalKnown > 0 ? `Taille estimée : ${formatBytes(totalKnown)}` : 'Contenu en cours',
    detail: parts.join(' · '),
    warning,
  }
}
