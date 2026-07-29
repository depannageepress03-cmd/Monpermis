interface SkeletonProps {
  height?: number | string
  width?: number | string
  className?: string
}

export function Skeleton({ height = 14, width = '100%', className }: SkeletonProps) {
  return (
    <span
      className={['ui-skeleton', className].filter(Boolean).join(' ')}
      style={{ display: 'block', height, width }}
      aria-hidden
    />
  )
}

export function SkeletonBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ui-skeleton-row" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={i === 0 ? 28 : 14} width={i % 2 === 0 ? '100%' : '72%'} />
      ))}
    </div>
  )
}
