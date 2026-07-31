import { useRef, type ReactNode } from 'react'
import { BrandName } from './BrandName'
import { useHeroParallax } from '../hooks/useHeroParallax'

type AuthStageProps = {
  /** Ligne d’aspiration sous la marque (hero). */
  tagline?: string
  /** Image plein cadre — route / permis. */
  imageSrc?: string
  children: ReactNode
}

/**
 * Scène d’auth premium : photo route full-bleed + marque hero + panneau formulaire.
 * Motion type Apple : ken burns, parallaxe pointeur, entrées staggered.
 */
export function AuthStage({
  tagline = 'Ton permis, une route claire.',
  imageSrc = '/home/i2.jpg',
  children,
}: AuthStageProps) {
  const mediaRef = useRef<HTMLImageElement>(null)
  useHeroParallax(mediaRef)

  return (
    <div className="auth-stage">
      <aside className="auth-stage-hero">
        <img
          ref={mediaRef}
          src={imageSrc}
          alt=""
          className="auth-stage-hero-media"
          draggable={false}
          fetchPriority="high"
        />
        <div className="auth-stage-hero-veil" aria-hidden="true" />
        <div className="auth-stage-hero-glow" aria-hidden="true" />
        <div className="auth-stage-hero-shine" aria-hidden="true" />
        <div className="auth-stage-hero-copy">
          <div
            className="auth-stage-logo-badge auth-stage-stagger"
            style={{ ['--stagger' as string]: '0' }}
          >
            <img src="/logo-mark.png" alt="" className="auth-stage-logo" width={56} height={56} />
          </div>
          <BrandName
            as="h1"
            className="auth-stage-brand auth-stage-stagger"
            style={{ ['--stagger' as string]: '1' }}
          />
          <p
            className="auth-stage-tagline auth-stage-stagger"
            style={{ ['--stagger' as string]: '2' }}
          >
            {tagline}
          </p>
        </div>
      </aside>

      <main className="auth-stage-panel" id="auth-form">
        <div className="auth-stage-panel-glass" aria-hidden="true" />
        <div className="auth-stage-panel-inner">{children}</div>
      </main>
    </div>
  )
}
