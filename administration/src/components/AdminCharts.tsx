interface SparklineProps {
  data: number[]
  color: string
  fill?: boolean
}

export function Sparkline({ data, color, fill }: SparklineProps) {
  const w = 80
  const h = 32
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return { x, y }
  })
  const path = `M${pts.map((p) => `${p.x},${p.y}`).join(' L')}`
  const area = `${path} L${w},${h} L0,${h} Z`
  const last = pts[pts.length - 1]

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="admin-sparkline" aria-hidden>
      {fill ? <path d={area} fill={color} opacity={0.15} /> : null}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={3} fill={color} />
    </svg>
  )
}

interface MiniDonutProps {
  pct: number
  color: string
}

export function MiniDonut({ pct, color }: MiniDonutProps) {
  const r = 16
  const cx = 20
  const cy = 20
  const stroke = 4
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))

  return (
    <svg width={40} height={40} aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(0,16,48,0.07)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - clamped / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill={color}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  )
}
