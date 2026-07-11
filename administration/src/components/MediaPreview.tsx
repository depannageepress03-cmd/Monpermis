import { resolveVideoEmbed } from '../utils/mediaEmbed'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { hasRichText } from '../utils/richText'

interface MediaPreviewProps {
  title?: string
  text?: string
  videoUrl?: string
  imageUrl?: string
  /** Masque le titre (déjà affiché ailleurs, ex. en-tête du module). */
  hideTitle?: boolean
  /** Disposition : auto (split si média+texte), stack, ou split forcé. */
  layout?: 'auto' | 'stack' | 'split'
}

/**
 * Affichage pédagogique unifié :
 * Titre → Vidéo / Photo → Texte
 */
export function MediaPreview({
  title,
  text,
  videoUrl,
  imageUrl,
  hideTitle = false,
  layout = 'auto',
}: MediaPreviewProps) {
  const hasTitle = Boolean(title?.trim()) && !hideTitle
  const hasText = hasRichText(text)
  const video = videoUrl ? resolveVideoEmbed(videoUrl) : null
  const hasImage = Boolean(imageUrl?.trim())
  const hasMedia = Boolean(video || hasImage)
  const useSplit =
    layout === 'split' || (layout === 'auto' && hasMedia && hasText)

  if (!hasTitle && !hasText && !hasMedia) {
    return <p className="parcours-media-empty">Aucun contenu média dans ce module.</p>
  }

  return (
    <div className={`parcours-media${useSplit ? ' is-split' : ' is-stack'}`}>
      {hasTitle ? <h4 className="parcours-media-title">{title}</h4> : null}

      {hasMedia ? (
        <div className="parcours-media-stage">
          {video ? (
            <div className="parcours-media-frame parcours-media-video">
              {video.kind === 'iframe' ? (
                <iframe
                  src={video.src}
                  title={title?.trim() || 'Vidéo pédagogique'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video src={resolveMediaUrl(video.src)} controls playsInline preload="auto">
                  Votre navigateur ne peut pas lire cette vidéo.
                </video>
              )}
            </div>
          ) : null}

          {hasImage ? (
            <div className="parcours-media-frame parcours-media-image">
              <img
                src={resolveMediaUrl(imageUrl)}
                alt={title?.trim() || 'Illustration pédagogique'}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {hasText ? (
        <div
          className="parcours-media-text rich-content"
          dangerouslySetInnerHTML={{ __html: text ?? '' }}
        />
      ) : null}
    </div>
  )
}
