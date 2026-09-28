export type Point = [number, number]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function roadGeometry(bl: Point, br: Point, tl: Point, tr: Point) {
  const edge = (t: number, left: boolean): Point => {
    const [a, b] = left ? [bl, tl] : [br, tr]
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
  }
  const center = (t: number): Point => {
    const left = edge(t, true)
    const right = edge(t, false)
    return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2]
  }
  const width = (t: number) => {
    const left = edge(t, true)
    const right = edge(t, false)
    return Math.hypot(right[0] - left[0], right[1] - left[1])
  }
  const baseWidth = width(0)
  const dashes: Array<{ points: Point[]; opacity: number }> = []
  let t = 0
  while (t < 0.97) {
    const scale = width(t) / baseWidth
    const next = Math.min(t + 0.075 * scale, 1)
    const first = center(t)
    const second = center(next)
    const firstWidth = width(t) * 0.045
    const secondWidth = width(next) * 0.045
    const dx = second[0] - first[0]
    const dy = second[1] - first[1]
    const length = Math.hypot(dx, dy) || 1
    const nx = -dy / length
    const ny = dx / length
    dashes.push({
      points: [
        [first[0] - nx * firstWidth / 2, first[1] - ny * firstWidth / 2],
        [first[0] + nx * firstWidth / 2, first[1] + ny * firstWidth / 2],
        [second[0] + nx * secondWidth / 2, second[1] + ny * secondWidth / 2],
        [second[0] - nx * secondWidth / 2, second[1] - ny * secondWidth / 2],
      ],
      opacity: Math.max(0, 1 - t * 1.05) * 0.92,
    })
    t = next + 0.06 * scale
  }
  return { edge, center, width, dashes }
}
