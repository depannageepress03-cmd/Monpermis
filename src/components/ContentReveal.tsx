import type { ReactNode } from 'react'

type Props = {
  loading: boolean
  skeleton: ReactNode
  children: ReactNode
}

/** Crossfade skeleton → contenu. */
export function ContentReveal({ loading, skeleton, children }: Props) {
  if (loading) return <>{skeleton}</>
  return <div className="mp-content-enter">{children}</div>
}
