/** Helpers disponibilité moniteur (plages hebdo − créneaux déjà pris). */

export function timeToMinutes(value) {
  const [h, m] = String(value || '0:0')
    .slice(0, 5)
    .split(':')
    .map((part) => parseInt(part, 10) || 0)
  return h * 60 + m
}

export function minutesToTime(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd)
}

export function normalizeTime(value) {
  return String(value || '').trim().slice(0, 5)
}

/** Fenêtres hebdo pour une date calendaire (YYYY-MM-DD). */
export function windowsForDate(weeklyAvailability, dateStr) {
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return (weeklyAvailability || [])
    .filter((slot) => Number(slot.dayOfWeek) === day)
    .map((slot) => ({
      start: normalizeTime(slot.start || '08:00'),
      end: normalizeTime(slot.end || '18:00'),
    }))
    .filter((slot) => timeToMinutes(slot.end) > timeToMinutes(slot.start))
}

/** Soustrait des intervalles occupés d’une liste de fenêtres libres. */
export function subtractBusy(windows, busyList) {
  let free = windows.map((w) => ({ ...w }))
  for (const busy of busyList) {
    const bStart = normalizeTime(busy.startTime || busy.start)
    const bEnd = normalizeTime(busy.endTime || busy.end)
    const next = []
    for (const window of free) {
      if (!intervalsOverlap(window.start, window.end, bStart, bEnd)) {
        next.push(window)
        continue
      }
      const wStart = timeToMinutes(window.start)
      const wEnd = timeToMinutes(window.end)
      const occupiedStart = timeToMinutes(bStart)
      const occupiedEnd = timeToMinutes(bEnd)
      if (occupiedStart > wStart) {
        next.push({ start: window.start, end: minutesToTime(occupiedStart) })
      }
      if (occupiedEnd < wEnd) {
        next.push({ start: minutesToTime(occupiedEnd), end: window.end })
      }
    }
    free = next.filter((slot) => timeToMinutes(slot.end) > timeToMinutes(slot.start))
  }
  return free
}

export function isWithinWindows(windows, startTime, endTime) {
  const start = normalizeTime(startTime)
  const end = normalizeTime(endTime)
  if (!(timeToMinutes(end) > timeToMinutes(start))) return false
  return windows.some(
    (window) =>
      timeToMinutes(start) >= timeToMinutes(window.start) &&
      timeToMinutes(end) <= timeToMinutes(window.end),
  )
}

export function isValidHhMm(value) {
  return /^\d{2}:\d{2}$/.test(normalizeTime(value))
}
