import { memo, useMemo, type RefObject } from 'react'
import { getCarPosition, type CarPosition, type LoginLayout } from '../useLoginPhase'
import { roadGeometry, type Point } from './roadGeometry'
import { Car } from './Car'

interface RoadSvgProps {
  layout: LoginLayout
  position: CarPosition
  phase: string
  started: boolean
  svgRef: RefObject<SVGSVGElement | null>
}

const paths = (points: Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ')

function RoadSvgComponent({ layout, position, phase, started, svgRef }: RoadSvgProps) {
  const compact = layout === 'compact'
  const geometry = useMemo(
    () =>
      compact
        ? roadGeometry([-60, 400], [460, 400], [183, 30], [217, 30])
        : roadGeometry([-40, 940], [760, 940], [1175, -30], [1235, -30]),
    [compact],
  )
  const leftEdge = geometry.edge(0.05, true)
  const rightEdge = geometry.edge(0.05, false)
  const leftInner = geometry.edge(0.08, true)
  const rightInner = geometry.edge(0.08, false)
  const leftTop = geometry.edge(1, true)
  const rightTop = geometry.edge(1, false)
  const leftBottom = geometry.edge(0, true)
  const rightBottom = geometry.edge(0, false)
  const roadPoints = paths([leftBottom, rightBottom, rightTop, leftTop])
  const roadGradient = compact ? 'login-road-compact' : 'login-road-desktop'
  const dashPoints = geometry.dashes.map((dash) => paths(dash.points)).join(' ')
  const leftSign = geometry.edge(compact ? 0.45 : 0.39, true)
  const rightSign = geometry.edge(compact ? 0.62 : 0.52, false)
  const leftX = leftSign[0] - (compact ? 20 : 50)
  const leftY = leftSign[1] - (compact ? 18 : 42)
  const rightX = rightSign[0] + (compact ? 14 : 70)
  const rightY = rightSign[1] - (compact ? 34 : 70)

  return (
    <svg
      ref={svgRef}
      className={`login-road-svg ${compact ? 'login-road-svg--compact' : 'login-road-svg--desktop'}`}
      viewBox={compact ? '0 0 400 380' : '0 0 1440 900'}
      preserveAspectRatio={compact ? 'xMidYMax meet' : 'xMidYMax slice'}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={roadGradient} x1={geometry.center(0)[0]} y1={geometry.center(0)[1]} x2={geometry.center(1)[0]} y2={geometry.center(1)[1]} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1A3874" />
          <stop offset=".55" stopColor="#132C63" />
          <stop offset="1" stopColor="#0A1B3D" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="login-road-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".7" stopColor="#FFFFFF" stopOpacity=".5" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={roadPoints} fill={`url(#${roadGradient})`} />
      <polygon
        points={paths([leftBottom, leftInner, geometry.edge(1, true), leftTop])}
        fill="url(#login-road-edge)"
        opacity=".7"
      />
      <polygon
        points={paths([rightBottom, rightInner, rightTop, geometry.edge(1, false)])}
        fill="url(#login-road-edge)"
        opacity=".7"
      />
      <g className="login-road-dashes">
        {geometry.dashes.map((dash, index) => (
          <polygon key={index} points={paths(dash.points)} opacity={dash.opacity} />
        ))}
      </g>
      <ellipse cx={compact ? 100 : 330} cy={compact ? 370 : 880} rx={compact ? 24 : 90} ry={compact ? 7 : 24} fill="#000000" opacity=".35" />
      <g className="login-road-sign" transform={`translate(${rightX} ${rightY})`}>
        <path d={compact ? 'M0 32 L18 0 L36 32 Z' : 'M0 50 L28 0 L56 50 Z'} fill="#FFFFFF" stroke="#FFB400" strokeWidth={compact ? 3 : 5} />
        <path d={compact ? 'M17 21 L23 21 M20 15 L20 21' : 'M26 33 L30 33 M28 25 L28 33'} stroke="#0A1B3D" strokeWidth={compact ? 2 : 3} strokeLinecap="round" />
        <path d={compact ? 'M18 28 L22 28' : 'M27 42 L29 42'} stroke="#0A1B3D" strokeWidth={compact ? 2 : 3} strokeLinecap="round" />
        <path d={compact ? 'M18 32 V50' : 'M28 50 V82'} stroke="#B9C4DA" strokeWidth={compact ? 3 : 6} />
      </g>
      <g className={`login-road-sign ${compact && 'login-road-sign--small-hidden'}`} transform={`translate(${leftX} ${leftY})`}>
        {compact ? (
          <>
            <circle cx="18" cy="18" r="18" fill="#FFFFFF" stroke="#FFB400" strokeWidth="3" />
            <text x="18" y="24" textAnchor="middle" fill="#0A1B3D" fontSize="15" fontWeight="800">50</text>
            <path d="M18 36 V54" stroke="#B9C4DA" strokeWidth="3" />
          </>
        ) : (
          <>
            <rect width="58" height="58" rx="29" fill="#FFFFFF" stroke="#FFB400" strokeWidth="5" />
            <text x="29" y="38" textAnchor="middle" fill="#0A1B3D" fontSize="25" fontWeight="800">50</text>
            <path d="M29 58 V92" stroke="#B9C4DA" strokeWidth="6" />
          </>
        )}
      </g>
      <Car
        x={started ? position.x : getCarPosition(layout, 'enter').x}
        y={started ? position.y : getCarPosition(layout, 'enter').y}
        scale={started ? position.scale : getCarPosition(layout, 'enter').scale}
        rotation={compact ? -18.2 : 41}
        phase={phase}
      />
    </svg>
  )
}

export const RoadSvg = memo(RoadSvgComponent)
