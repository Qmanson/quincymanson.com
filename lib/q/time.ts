import type { Cadence } from './types'

// All of q's day boundaries are in this zone, not the server's (UTC on Vercel).
export const TZ = 'America/Chicago'

// Dates are passed around as 'YYYY-MM-DD' strings. Arithmetic happens on
// UTC-midnight Date objects so DST never shifts a day.

export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

function toDate(d: string): Date {
  return new Date(d + 'T00:00:00Z')
}

function toStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: string, n: number): string {
  const x = toDate(d)
  x.setUTCDate(x.getUTCDate() + n)
  return toStr(x)
}

export function addMonths(d: string, n: number): string {
  const x = toDate(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return toStr(x)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000)
}

/** Monday of d's week. */
export function weekStart(d: string): string {
  const dow = (toDate(d).getUTCDay() + 6) % 7 // mon = 0
  return addDays(d, -dow)
}

export function monthStart(d: string): string {
  return d.slice(0, 8) + '01'
}

export function quarterStart(d: string): string {
  const m = Number(d.slice(5, 7))
  const qm = String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')
  return `${d.slice(0, 4)}-${qm}-01`
}

export function yearStart(d: string): string {
  return d.slice(0, 4) + '-01-01'
}

type FixedCadence = Exclude<Cadence, 'interval'>

export function periodStart(cadence: FixedCadence, d: string): string {
  switch (cadence) {
    case 'daily': return d
    case 'weekly': return weekStart(d)
    case 'monthly': return monthStart(d)
    case 'quarterly': return quarterStart(d)
    case 'yearly': return yearStart(d)
  }
}

export function nextPeriodStart(cadence: FixedCadence, start: string): string {
  switch (cadence) {
    case 'daily': return addDays(start, 1)
    case 'weekly': return addDays(start, 7)
    case 'monthly': return addMonths(start, 1)
    case 'quarterly': return addMonths(start, 3)
    case 'yearly': return addMonths(start, 12)
  }
}

export function periodEnd(cadence: FixedCadence, start: string): string {
  return addDays(nextPeriodStart(cadence, start), -1)
}

/** Weeks between the week containing `a` and the week containing `b`. */
export function weeksBetween(a: string, b: string): number {
  return Math.round(daysBetween(weekStart(a), weekStart(b)) / 7)
}

const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtDow = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })

export function formatShort(d: string): string {
  return fmtShort.format(toDate(d)).toLowerCase()
}

export function formatDow(d: string): string {
  return fmtDow.format(toDate(d)).toLowerCase()
}

/** "today", "yesterday", "in 3d", "2d ago" … */
export function relativeDay(d: string, from: string = today()): string {
  const n = daysBetween(from, d)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n}d` : `${-n}d ago`
}

/** Calendar date (in TZ) of a timestamp. */
export function dateOf(ts: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ts))
}

export function isSunday(d: string): boolean {
  return toDate(d).getUTCDay() === 0
}
