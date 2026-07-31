import type { ReactNode } from 'react'
import { BrandName } from './BrandName'

type AuthStageProps = {
  /** Ligne d’aspiration sous la marque (hero). */
  tagline?: string
  /** Image plein cadre — route / permis. */
  imageSrc?: string
  children: ReactNode
}

/**
 * Scène d’auth premium : photo route full-bleed + marque hero + panneau formulaire.
 * Inspiration edtech populaire, palette logo Monpermis (navy / vert / blanc).
 */
export function AuthStage({
  tagline = 'Ton permis, une route claire.',
  imageSrc = '/home/i2.jpg',
  children,
}: AuthStageProps) {
  return (
    <div className="auth-stage">
      <aside className="auth-stage-hero">
        <img
          src={imageSrc}
          alt=""
          className="auth-stage-hero-media"
          draggable={false}
        />
        <div className="auth-stage-hero-veil" aria-hidden="true" />
        <div className="auth-stage-hero-glow" aria-hidden="true" />
        <div className="auth-stage-hero-copy">
          <div className="auth-stage-logo-badge">
            <img src="/logo-mark.png" alt="" className="auth-stage-logo" width={62} height={62} />
          </div>
          <BrandName as="h1" className="auth-stage-brand" />
          <p className="auth-stage-tagline">{tagline}</p>
        </div>
      </aside>

      <main className="auth-stage-panel">
        <div className="auth-stage-panel-inner">{children}</div>
      </main>
    </div>
  )
}
