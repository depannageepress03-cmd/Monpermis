import { useEffect, type RefObject } from 'react'

/**
 * Léger parallaxe pointeur sur un média hero (desktop).
 * Désactivé si prefers-reduced-motion ou pointeur grossier.
 * Le média doit avoir une hauteur définie (min-height/height) pour un effet visible.
 */
export function useHeroParallax(
  mediaRef: RefObject<HTMLElement | null>,
  enabled = true,
  strength = 1,
) {
  useEffect(() => {
    if (!enabled) return
    const media = mediaRef.current
    if (!media) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const parent = media.parentElement
    if (!parent) return

    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const tick = () => {
      currentX += (targetX - currentX) * 0.08 * strength
      currentY += (targetY - currentY) * 0.08 * strength
      media.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`)
      media.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`)
      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      targetX = nx * -12 * strength
      targetY = ny * -8 * strength
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
    }

    parent.addEventListener('pointermove', onMove)
    parent.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      parent.removeEventListener('pointermove', onMove)
      parent.removeEventListener('pointerleave', onLeave)
      media.style.removeProperty('--parallax-x')
      media.style.removeProperty('--parallax-y')
    }
  }, [mediaRef, enabled, strength])
}
