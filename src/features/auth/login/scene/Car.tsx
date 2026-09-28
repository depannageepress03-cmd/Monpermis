import { useId, useState } from 'react'

interface CarProps {
  x: number
  y: number
  scale: number
  rotation: number
  phase: string
}

export function Car({ x, y, scale, rotation, phase }: CarProps) {
  const id = useId().replace(/:/g, '')
  const beamId = `${id}-carBeam`
  const shadowId = `${id}-carShadow`
  const [moving, setMoving] = useState(false)

  return (
    <g
      className={`login-car ${moving ? 'is-moving' : ''}`}
      data-car
      data-phase={phase}
      style={{ transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})` }}
      aria-hidden="true"
      onTransitionRun={() => setMoving(true)}
      onTransitionEnd={() => setMoving(false)}
    >
      <defs>
        <linearGradient id={beamId} x1="0" y1="-71" x2="0" y2="-170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF3C4" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFF3C4" stopOpacity="0" />
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <path className="car-beam" d="M-24 -71 L-52 -170 L52 -170 L24 -71 Z" fill={`url(#${beamId})`} />
      <path className="car-trail" d="M-18 80 V150 M0 84 V160 M18 80 V150" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
      <rect x="-34" y="-71" width="68" height="142" rx="26" fill="#000" opacity=".35" transform="translate(4 8)" filter={`url(#${shadowId})`} />
      <ellipse cx="-36" cy="-25" rx="5" ry="4" fill="#F2A900" />
      <ellipse cx="36" cy="-25" rx="5" ry="4" fill="#F2A900" />
      <rect x="-34" y="-71" width="68" height="142" rx="26" fill="#FFB400" />
      <path d="M-26 -53 Q0 -67 26 -53" stroke="#FFD466" strokeWidth="3" fill="none" opacity=".8" />
      <path d="M-25 -31 Q0 -41 25 -31 L20 -13 Q0 -19 -20 -13 Z" fill="#0A1B3D" />
      <rect x="-22" y="-13" width="44" height="46" rx="10" fill="#F2A900" />
      <rect x="-15" y="1" width="30" height="12" rx="4" fill="#FFFFFF" />
      <rect x="-15" y="5" width="30" height="4" fill="#0BAA4F" />
      <path d="M-20 35 Q0 40 20 35 L24 49 Q0 56 -24 49 Z" fill="#0A1B3D" />
      <rect x="-28" y="-69" width="14" height="7" rx="3.5" fill="#FFF6D6" />
      <rect x="14" y="-69" width="14" height="7" rx="3.5" fill="#FFF6D6" />
      <rect x="-28" y="63" width="14" height="6" rx="3" fill="#E23B3B" />
      <rect x="14" y="63" width="14" height="6" rx="3" fill="#E23B3B" />
    </g>
  )
}
