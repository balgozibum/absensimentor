// ───────────────────────────────────────────────────────────────
// Time + date helpers. Times are 'HH:MM' (24h); dates are 'YYYY-MM-DD'.
// All formatting is Indonesian (id-ID).
// ───────────────────────────────────────────────────────────────

import type { ActivityBlock, AttendanceStatus, Settings } from '../types'

/** 'HH:MM' → minutes since midnight */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** minutes since midnight → 'HH:MM' (clamped to a single day) */
export function fromMinutes(total: number): string {
  const t = Math.max(0, Math.min(24 * 60, Math.round(total)))
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** human duration, e.g. 95 → '1j 35m', 40 → '40m', 120 → '2j' */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}j`
  return `${h}j ${r}m`
}

/** minutes between two 'HH:MM' marks (end assumed same/later day) */
export function durationBetween(start: string, end: string): number {
  return Math.max(0, toMinutes(end) - toMinutes(start))
}

// ── Dates ────────────────────────────────────────────────────────

export function todayISO(): string {
  return toISODate(new Date())
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, delta: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/** 'Senin, 3 Juni 2026' */
export function formatDateLong(iso: string): string {
  const d = parseISODate(iso)
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

/** '3 Jun 2026' */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`
}

/** '3 Jun' */
export function formatDayMonth(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`
}

export function weekdayShort(iso: string): string {
  return HARI_SINGKAT[parseISODate(iso).getDay()]
}

export function weekdayLong(iso: string): string {
  return HARI[parseISODate(iso).getDay()]
}

export function isWeekend(iso: string): boolean {
  const day = parseISODate(iso).getDay()
  return day === 0 || day === 6
}

/** employee-portal password derived from birth date: 'YYYY-MM-DD' → 'DDMMYYYY' */
export function birthdatePassword(birthDate: string): string {
  if (!birthDate) return ''
  const [y, m, d] = birthDate.split('-')
  return `${d ?? ''}${m ?? ''}${y ?? ''}`
}

/** 7 ISO dates Mon→Sun for the week containing `iso` */
export function weekDates(iso: string): string[] {
  const d = parseISODate(iso)
  const day = d.getDay() // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = addDays(iso, mondayOffset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// ── Attendance rules (HANDOVER §3.2) ─────────────────────────────

export interface LateResult {
  status: AttendanceStatus
  lateMinutes: number
}

/** Compare a clock-in time against fixed hours + grace. */
export function evaluateClockIn(time: string, settings: Settings): LateResult {
  const limit = toMinutes(settings.clockIn) + settings.graceMinutes
  const diff = toMinutes(time) - limit
  if (diff > 0) return { status: 'late', lateMinutes: diff }
  return { status: 'ontime', lateMinutes: 0 }
}

// ── Timeline gaps (HANDOVER §3.5) ────────────────────────────────

export interface TimelineSegment {
  kind: 'activity' | 'gap'
  startMin: number
  endMin: number
  block?: ActivityBlock
  /** gap longer than the "long gap" threshold → flag for admin */
  long?: boolean
}

/**
 * Resolve a day's activity blocks (within the work window) into an ordered
 * list of activity + gap segments. Empty space inside work hours surfaces as
 * a gap; gaps ≥ longGapMinutes are flagged so admins can spot idle time.
 */
export function buildTimeline(
  blocks: ActivityBlock[],
  workStart: string,
  workEnd: string,
  longGapMinutes = 45,
): TimelineSegment[] {
  const startMin = toMinutes(workStart)
  const endMin = toMinutes(workEnd)
  const sorted = [...blocks]
    .filter((b) => toMinutes(b.endTime) > startMin && toMinutes(b.startTime) < endMin)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))

  const segments: TimelineSegment[] = []
  let cursor = startMin

  for (const block of sorted) {
    const bStart = Math.max(startMin, toMinutes(block.startTime))
    const bEnd = Math.min(endMin, toMinutes(block.endTime))
    if (bStart > cursor) {
      const len = bStart - cursor
      segments.push({ kind: 'gap', startMin: cursor, endMin: bStart, long: len >= longGapMinutes })
    }
    if (bEnd > cursor) {
      segments.push({ kind: 'activity', startMin: Math.max(cursor, bStart), endMin: bEnd, block })
      cursor = bEnd
    }
  }

  if (cursor < endMin) {
    const len = endMin - cursor
    segments.push({ kind: 'gap', startMin: cursor, endMin, long: len >= longGapMinutes })
  }
  return segments
}

/** total covered (worked) minutes within the window */
export function coveredMinutes(segments: TimelineSegment[]): number {
  return segments
    .filter((s) => s.kind === 'activity')
    .reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
}

/** total gap minutes within the window */
export function gapMinutes(segments: TimelineSegment[]): number {
  return segments
    .filter((s) => s.kind === 'gap')
    .reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
}
