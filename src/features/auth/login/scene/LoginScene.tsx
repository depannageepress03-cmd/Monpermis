import { useRef } from 'react'
import type { RefObject } from 'react'
import { getCarPosition, type LoginLayout, type LoginPhase } from '../useLoginPhase'
import { useSceneAnchor } from '../useSceneAnchor'
import { HintChip } from './HintChip'
import { RoadSvg } from './RoadSvg'

interface LoginSceneProps {
  layout: LoginLayout
  phase: LoginPhase
  positionPhase: LoginPhase
  copy: string
  compactCopy: string
  light: 'red' | 'yellow' | 'green'
  started: boolean
  containerRef: RefObject<HTMLElement | null>
  obstacleRef: RefObject<HTMLElement | null>
}

export function LoginScene({
  layout,
  phase,
  positionPhase,
  copy,
  compactCopy,
  light,
  started,
  containerRef,
  obstacleRef,
}: LoginSceneProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const anchorPhase = positionPhase === 'half' || positionPhase === 'ready' ? positionPhase : 'empty'
  const hintRef = useRef<HTMLSpanElement>(null)
  const anchor = useSceneAnchor(containerRef, svgRef, obstacleRef, hintRef, layout, anchorPhase)
  const position = getCarPosition(layout, phase === 'success' ? 'success' : positionPhase)
  const hintCopy = phase === 'success' ? '' : layout === 'compact' ? compactCopy : copy

  return (
    <div className="login-scene" aria-hidden="true">
      <div className="login-scene__halo" />
      <RoadSvg layout={layout} position={position} phase={phase} started={started} svgRef={svgRef} />
      <HintChip
        copy={hintCopy}
        light={light}
        left={anchor.left}
        top={anchor.top}
        visible={anchor.visible && phase !== 'success'}
        innerRef={hintRef}
      />
    </div>
  )
}
