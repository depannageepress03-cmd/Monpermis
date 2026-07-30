/** Full-page loader used instead of blank `return null` while auth/data loads. */
export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
