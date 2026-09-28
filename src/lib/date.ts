// ---- Date & formatting helpers (local time, DST-safe) ----

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0) // noon avoids DST edges
}

export function addDaysKey(key: string, days: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** "17:15" -> 1035 ; "9:05" -> 545 */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** 1035 -> "17:15" */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function weekdayShort(key: string): string {
  return WD_SHORT[parseKey(key).getDay()]
}

export function fmtDateLong(key: string): string {
  const d = parseKey(key)
  return `${WD[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function fmtDateShort(key: string): string {
  const d = parseKey(key)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

export function daysBetween(aKey: string, bKey: string): number {
  const a = parseKey(aKey).getTime()
  const b = parseKey(bKey).getTime()
  return Math.round((b - a) / 86400000)
}

export function weekStartKey(key: string): string {
  const d = parseKey(key)
  const dow = d.getDay()
  const diff = dow === 0 ? 6 : dow - 1 // weeks start Monday
  d.setDate(d.getDate() - diff)
  return dateKey(d)
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Still up, Maryem?'
  if (h < 12) return 'Good morning, Maryem'
  if (h < 18) return 'Good afternoon, Maryem'
  return 'Good evening, Maryem'
}

/** Merge busy minute-ranges into non-overlapping slots, then return free gaps >= minLen inside [fromMin, toMin]. */
export function freeSlots(
  busy: Array<{ start: number; end: number }>,
  fromMin: number,
  toMin: number,
  minLen: number,
): Array<{ startMin: number; endMin: number }> {
  const clipped = busy
    .map((b) => ({ start: Math.max(b.start, fromMin), end: Math.min(b.end, toMin) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const b of clipped) {
    const last = merged[merged.length - 1]
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end)
    else merged.push({ ...b })
  }
  const slots: Array<{ startMin: number; endMin: number }> = []
  let cursor = fromMin
  for (const b of merged) {
    if (b.start - cursor >= minLen) slots.push({ startMin: cursor, endMin: b.start })
    cursor = Math.max(cursor, b.end)
  }
  if (toMin - cursor >= minLen) slots.push({ startMin: cursor, endMin: toMin })
  return slots
}
