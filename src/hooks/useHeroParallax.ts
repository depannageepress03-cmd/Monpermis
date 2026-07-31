import { useEffect, type RefObject } from 'react'

/**
 * Léger parallaxe pointeur sur un média hero (desktop).
 * Désactivé si prefers-reduced-motion ou pointeur grossier.
 */
export function useHeroParallax(
  mediaRef: RefObject<HTMLElement | null>,
  enabled = true,
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
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08
      media.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`)
      media.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`)
      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      targetX = nx * -18
      targetY = ny * -12
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
  }, [mediaRef, enabled])
}
