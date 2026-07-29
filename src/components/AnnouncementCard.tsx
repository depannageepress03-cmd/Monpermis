import { ExternalLink } from 'lucide-react'
import {
  announcementLooksLikeHtml,
  stripAnnouncementHtml,
  type Announcement,
} from '../api/announcements'
import { resolveMediaUrl } from '../utils/mediaUrl'

const KIND_LABELS: Record<Announcement['kind'], string> = {
  info: 'Info',
  promo: 'Promo',
  alerte: 'Alerte',
}

export function AnnouncementCard({
  item,
  compact = false,
  onOpen,
}: {
  item: Announcement
  compact?: boolean
  onOpen?: () => void
}) {
  const isHtml = announcementLooksLikeHtml(item.body)
  const plain = isHtml ? stripAnnouncementHtml(item.body) : item.body
  const image = resolveMediaUrl(item.imageUrl)

  const content = (
    <>
      <span className={`home-news-kind home-news-kind--${item.kind}`}>{KIND_LABELS[item.kind]}</span>
      {image ? (
        <img src={image} alt="" className="home-news-image" loading="lazy" />
      ) : null}
      <strong>{item.title}</strong>
      {item.body ? (
        compact ? (
          <p>{plain.length > 160 ? `${plain.slice(0, 159)}…` : plain}</p>
        ) : isHtml ? (
          <div
            className="home-news-rich"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        ) : (
          <p>{item.body}</p>
        )
      ) : null}
      {item.ctaUrl ? (
        <span className="home-news-cta">
          En savoir plus
          <ExternalLink size={12} />
        </span>
      ) : null}
      <em className="home-news-date">
        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </em>
    </>
  )

  if (onOpen) {
    return (
      <button
        type="button"
        className={`home-app-news-card home-news-card--${item.kind} home-news-card-btn`}
        onClick={onOpen}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={`home-app-news-card home-news-card--${item.kind}`}>{content}</article>
  )
}
