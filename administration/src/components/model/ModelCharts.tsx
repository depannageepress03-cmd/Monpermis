import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

/* Composants graphiques du modèle de tableau de bord (repris à l'identique du projet Canaan Mining). */

export const nf = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
export const fcfa = (n: number) => `${nf(n)} FCFA`

export function pctText(p: number | null | undefined) {
  if (p === null || p === undefined) return ''
  const abs = Math.abs(p)
  const sign = p > 0 ? '+' : p < 0 ? '−' : ''
  if (abs > 999) return `${p > 0 ? '+999' : '−999'}+ %`
  return `${sign}${String(abs).replace('.', ',')} %`
}

export function compactAmount(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2).replace('.', ',')} Md`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2).replace('.', ',')} M`
  return nf(v)
}

type Pt = [number, number]

/** Courbe lissée (Catmull-Rom → Bézier). */
function smoothPath(P: Pt[]) {
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[i + 2] || p2
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export function niceScale(mx: number) {
  const unit: [number, string] =
    mx >= 1e15 ? [1, 'exp'] : mx >= 1e9 ? [1e9, ' Md'] : mx >= 1e6 ? [1e6, ' M'] : mx >= 1e3 ? [1e3, ' k'] : [1, '']
  const m = Math.max(mx, 1) / unit[0]
  const raw = m / 5
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
  const top = Math.ceil(m / step - 1e-9) * step
  const ticks: number[] = []
  for (let t = 0; t <= top + 1e-9; t += step) ticks.push(t)
  const fmt = (t: number) =>
    unit[1] === 'exp'
      ? t === 0
        ? '0'
        : t.toExponential(1).replace('.', ',').replace('e+', ' e')
      : (unit[0] === 1 ? String(Math.round(t)) : t.toFixed(1).replace('.', ',')) + unit[1]
  return { unit, ticks, top: top * unit[0], fmt }
}

/* ---------- mini-courbe d'une carte KPI ---------- */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = useId().replace(/:/g, '')
  const W = 120
  const H = 38
  const mx = Math.max(1, ...data)
  const n = data.length
  const x = (i: number) => (n < 2 ? 0 : (i * W) / (n - 1))
  const y = (v: number) => H - 4 - ((H - 10) * v) / mx
  const P: Pt[] = data.map((v, i) => [x(i), y(v)])
  const d = smoothPath(P.length ? P : [[0, H - 4]])
  return (
    <svg className="cx-spark2" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${W} ${H}L0 ${H}Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ---------- carte KPI ---------- */
export function KpiCard({
  icon,
  tone,
  label,
  value,
  unit,
  trend,
  vs,
  spark,
  color,
}: {
  icon: ReactNode
  tone: 'blue' | 'green' | 'sky' | 'gold'
  label: string
  value: string
  unit?: string
  trend: number | null | undefined
  vs: string
  spark: number[]
  color: string
}) {
  const none = trend === null || trend === undefined
  return (
    <div className="cx-kc">
      <span className={`cx-kc-ico cx-kc-${tone}`}>{icon}</span>
      <div className="cx-kc-body">
        <span className="cx-kc-label">{label}</span>
        <span className="cx-kc-value">
          {value}
          {unit ? <> <small>{unit}</small></> : null}
        </span>
        <div className="cx-kc-foot">
          <span className={`cx-kc-trend${!none && (trend as number) < 0 ? ' cx-down' : ''}${none ? ' cx-none' : ''}`}>
            {none ? null : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={(trend as number) < 0 ? 'M12 5v14m-6-6 6 6 6-6' : 'M12 19V5m-6 6 6-6 6 6'} />
                </svg>
                {pctText(trend)}
              </>
            )}
          </span>
          <span className="cx-kc-vs">{none ? 'sans comparaison' : vs}</span>
          <Sparkline data={spark} color={color} />
        </div>
      </div>
    </div>
  )
}

/* ---------- en-tête de panneau ---------- */
export function PanelHead({
  icon,
  tile,
  title,
  sub,
  extra,
}: {
  icon: ReactNode
  tile?: boolean
  title: string
  sub: string
  extra?: ReactNode
}) {
  return (
    <div className="cx-panel-head cx-ph cx-ph-plain">
      <span className={`cx-phi${tile ? ' cx-phi-tile' : ''}`}>{icon}</span>
      <div className="cx-ph-txt">
        <h2 className="cx-panel-title">{title}</h2>
        <p className="cx-muted">{sub}</p>
      </div>
      {extra}
    </div>
  )
}

/* ---------- anneau de répartition ---------- */
export type RingSlice = { l: string; v: number; c: string }

export function Ring({ slices, label }: { slices: RingSlice[]; label: string }) {
  const tot = slices.reduce((a, s) => a + s.v, 0) || 1
  const r = 41
  const sw = 17
  const c = 2 * Math.PI * r
  const gap = slices.length > 1 ? 2.6 : 0
  let off = 0
  const arcs = slices.map((s) => {
    const len = (s.v / tot) * c
    const vis = Math.max(0.5, len - gap)
    const el = (
      <circle
        key={s.l}
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={s.c}
        strokeWidth={sw}
        strokeDasharray={`${vis.toFixed(2)} ${(c - vis).toFixed(2)}`}
        strokeDashoffset={(-off - gap / 2).toFixed(2)}
        transform="rotate(-90 60 60)"
      >
        <title>{`${s.l} : ${Math.round((s.v / tot) * 100)} %`}</title>
      </circle>
    )
    off += len
    return el
  })
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label}>
      {arcs}
    </svg>
  )
}

/* ---------- graphique d'évolution ---------- */
export type EvoPoint = { l: string; d: string; v: number }

export function EvoChart({ points }: { points: EvoPoint[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(700)
  const [active, setActive] = useState(points.length - 1)
  const H = 230

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setWidth(Math.max(320, Math.floor(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => setActive(points.length - 1), [points])

  const geo = useMemo(() => {
    const L = 54
    const R = 14
    const T = 12
    const B = 28
    const sc = niceScale(Math.max(1, ...points.map((p) => p.v)))
    const max = sc.top
    const n = points.length
    const x = (i: number) => L + (n < 2 ? 0 : (i * (width - L - R)) / (n - 1))
    const y = (v: number) => T + (H - T - B) * (1 - v / max)
    const maxLab = Math.max(2, Math.floor((width - L - R) / 58))
    const step = Math.max(1, Math.ceil(n / maxLab))
    const isLab = (i: number) => i % step === (n - 1) % step
    const P: Pt[] = points.map((p, i) => [x(i), y(p.v)])
    return { L, R, T, B, sc, n, x, y, isLab, P }
  }, [points, width])

  if (!points.length) return <div className="cx-evo-box" ref={boxRef} />
  const { L, R, T, sc, n, x, y, isLab, P } = geo
  const line = smoothPath(P)
  const cur = points[Math.min(active, n - 1)]
  const cx = x(Math.min(active, n - 1))
  const cy = y(cur.v)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (width / rect.width)
    const i = Math.round((px - L) / ((width - L - R) / Math.max(1, n - 1)))
    setActive(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="cx-evo-box" ref={boxRef} style={{ position: 'relative' }}>
      <svg
        className="cx-chart cx-chart2"
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label="Évolution du chiffre d'affaires"
        onMouseMove={onMove}
        onMouseLeave={() => setActive(n - 1)}
      >
        <defs>
          <linearGradient id="cx-eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00b050" stopOpacity=".28" />
            <stop offset="1" stopColor="#00b050" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {points.map((_, i) =>
          isLab(i) ? (
            <line key={`v${i}`} x1={x(i).toFixed(1)} x2={x(i).toFixed(1)} y1={T} y2={y(0)} stroke="#eef3f9" />
          ) : null,
        )}
        {sc.ticks.map((t) => {
          const v = t * sc.unit[0]
          return (
            <g key={`g${t}`}>
              <line x1={L} x2={width - R} y1={y(v)} y2={y(v)} stroke="#e9f0f8" />
              <text x={L - 10} y={y(v) + 3.5} textAnchor="end">
                {sc.fmt(t)}
              </text>
            </g>
          )
        })}
        <line x1={L} x2={L} y1={T} y2={y(0)} stroke="#d3dfee" />
        <path d={`${line}L${x(n - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z`} fill="url(#cx-eg)" />
        <path d={line} fill="none" stroke="#00b050" strokeWidth="2" strokeLinecap="round" />
        {P.map((q, i) =>
          isLab(i) ? (
            <circle key={`d${i}`} cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r="3.4" fill="#00b050" stroke="#fff" strokeWidth="1.6" />
          ) : null,
        )}
        <circle cx={cx} cy={cy} r="5" fill="#00b050" stroke="#fff" strokeWidth="2" />
        {points.map((p, i) =>
          isLab(i) ? (
            <text key={`x${i}`} x={x(i).toFixed(1)} y={H - 8} textAnchor="middle">
              {p.l}
            </text>
          ) : null,
        )}
      </svg>
      <div
        className="cx-evo-tip"
        style={{ left: Math.min(Math.max(cx - 60, 4), width - 150), top: Math.max(cy - 62, 0) }}
      >
        <b>{cur.d || cur.l}</b>
        <span>
          <i />
          {compactAmount(cur.v)} FCFA
        </span>
      </div>
    </div>
  )
}
