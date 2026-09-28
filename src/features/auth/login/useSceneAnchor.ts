import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { CarPosition, LoginLayout } from './useLoginPhase'
import { getCarPosition } from './useLoginPhase'

interface Anchor {
  left: number
  top: number
  visible: boolean
}

export function useSceneAnchor(
  containerRef: RefObject<HTMLElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  obstacleRef: RefObject<HTMLElement | null>,
  hintRef: RefObject<HTMLElement | null>,
  layout: LoginLayout,
  phase: 'empty' | 'half' | 'ready',
) {
  const [anchor, setAnchor] = useState<Anchor>({ left: 0, top: 0, visible: false })
  const recalculate = useCallback(() => {
    const container = containerRef.current
    const svg = svgRef.current
    const obstacle = obstacleRef.current
    const hint = hintRef.current
    if (!container || !svg) return
    const matrix = svg.getScreenCTM()
    if (!matrix) return

    const position: CarPosition = getCarPosition(layout, phase)
    const point = svg.createSVGPoint()
    point.x = position.x
    point.y = position.y
    const screenPoint = point.matrixTransform(matrix)
    const bounds = container.getBoundingClientRect()
    const halfWidth = layout === 'compact' ? 63 : 81
    const carHalfWidth = halfWidth * position.scale * Math.abs(matrix.a)
    const chipBounds = hint?.getBoundingClientRect()
    const chipWidth = chipBounds?.width || 230
    const chipHeight = chipBounds?.height || 36
    let left = screenPoint.x - bounds.left - carHalfWidth - chipWidth - 12
    if (left < 16) left = screenPoint.x - bounds.left + carHalfWidth + 12
    const top = screenPoint.y - bounds.top - 8
    const obstacleBounds = obstacle?.getBoundingClientRect()
    const chipRect = { left, right: left + chipWidth, top: top - chipHeight / 2, bottom: top + chipHeight / 2 }
    const intersectsObstacle = Boolean(
      obstacleBounds &&
        chipRect.left < obstacleBounds.right - bounds.left &&
        chipRect.right > obstacleBounds.left - bounds.left &&
        chipRect.top < obstacleBounds.bottom - bounds.top &&
        chipRect.bottom > obstacleBounds.top - bounds.top,
    )
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const insideViewport =
      bounds.top + chipRect.top >= 0 && bounds.top + chipRect.bottom <= viewportHeight
    const visible =
      left >= 16 &&
      left + chipWidth <= bounds.width - 16 &&
      insideViewport &&
      !intersectsObstacle
    setAnchor({ left, top, visible })
  }, [containerRef, hintRef, layout, obstacleRef, phase, svgRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(recalculate)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(container)
    if (obstacleRef.current) observer.observe(obstacleRef.current)
    if (hintRef.current) observer.observe(hintRef.current)
    void document.fonts?.ready.then(schedule)
    schedule()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [containerRef, hintRef, obstacleRef, recalculate])

  return anchor
}
