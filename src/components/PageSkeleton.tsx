/** Lightweight skeleton blocks for Home / list pages during first load. */
export function PageSkeleton({ variant = 'list' }: { variant?: 'home' | 'list' | 'detail' }) {
  if (variant === 'home') {
    return (
      <div className="page-skeleton page-skeleton--home" aria-hidden="true">
        <div className="page-skeleton-block" style={{ width: '36%', height: 18 }} />
        <div className="page-skeleton-block" style={{ width: '70%', height: 34, marginTop: 10 }} />
        <div className="page-skeleton-block" style={{ height: 72, marginTop: 18, borderRadius: 18 }} />
        <div className="page-skeleton-block" style={{ height: 88, marginTop: 14, borderRadius: 18 }} />
        <div className="page-skeleton-row" style={{ marginTop: 14 }}>
          <div className="page-skeleton-block" style={{ width: '48%', height: 120, borderRadius: 18 }} />
          <div className="page-skeleton-block" style={{ width: '48%', height: 120, borderRadius: 18 }} />
        </div>
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className="page-skeleton" aria-hidden="true">
        <div className="page-skeleton-block" style={{ width: '40%', height: 18 }} />
        <div className="page-skeleton-block" style={{ width: '85%', height: 28, marginTop: 12 }} />
        <div className="page-skeleton-block" style={{ height: 180, marginTop: 18, borderRadius: 18 }} />
        <div className="page-skeleton-block" style={{ width: '92%', height: 14, marginTop: 16 }} />
        <div className="page-skeleton-block" style={{ width: '80%', height: 14, marginTop: 8 }} />
        <div className="page-skeleton-block" style={{ height: 48, marginTop: 22, borderRadius: 14 }} />
      </div>
    )
  }

  return (
    <div className="page-skeleton page-skeleton--list" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="page-skeleton-card">
          <div className="page-skeleton-block" style={{ width: '42%', height: 14 }} />
          <div className="page-skeleton-block" style={{ width: '78%', height: 22, marginTop: 10 }} />
          <div className="page-skeleton-block" style={{ width: '58%', height: 12, marginTop: 12 }} />
        </div>
      ))}
    </div>
  )
}
