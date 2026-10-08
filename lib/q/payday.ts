import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { Domain, QLedger } from './types'
import { DECAY_PER_WEEK } from './points'
import { addDays, monthStart, quarterStart, today, weekStart, weeksBetween, yearStart } from './time'

type DB = SupabaseClient<Database>

export type Stub = {
  rows: QLedger[]
  gross: number
  deductions: number
  decay: number
  net: number
  byDomain: { domain: Domain | null; earned: number; lost: number }[]
  lateWeeks: { week: string; net: number; weeksLate: number; decay: number }[]
}

async function pendingRows(db: DB): Promise<QLedger[]> {
  const out: QLedger[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('q_ledger')
      .select('*')
      .eq('status', 'pending')
      .order('occurred_on')
      .range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}

/**
 * The pay stub for everything pending. A week's earnings keep full value
 * through the following week; after that each extra week unclaimed costs
 * DECAY_PER_WEEK of that week's (positive) net.
 */
export async function payStub(db: DB, t = today()): Promise<Stub> {
  const rows = await pendingRows(db)
  let gross = 0
  let deductions = 0
  const domains = new Map<Domain | null, { earned: number; lost: number }>()
  const weeks = new Map<string, number>()

  for (const r of rows) {
    if (r.amount > 0) gross += r.amount
    else deductions += r.amount
    const d = domains.get(r.domain) ?? { earned: 0, lost: 0 }
    if (r.amount > 0) d.earned += r.amount
    else d.lost += r.amount
    domains.set(r.domain, d)
    const w = weekStart(r.occurred_on)
    weeks.set(w, (weeks.get(w) ?? 0) + r.amount)
  }

  const lateWeeks = [...weeks.entries()].flatMap(([week, net]) => {
    const weeksLate = Math.max(0, weeksBetween(week, t) - 1)
    if (!weeksLate || net <= 0) return []
    return [{ week, net, weeksLate, decay: Math.round(net * Math.min(1, DECAY_PER_WEEK * weeksLate)) }]
  })
  const decay = lateWeeks.reduce((s, w) => s + w.decay, 0)

  return {
    rows,
    gross,
    deductions,
    decay,
    net: gross + deductions - decay,
    byDomain: [...domains.entries()]
      .map(([domain, v]) => ({ domain, ...v }))
      .sort((a, b) => b.earned + b.lost - (a.earned + a.lost)),
    lateWeeks,
  }
}

/** Move everything pending into the balance. */
export async function claim(db: DB): Promise<{ net: number; paydayId: string | null }> {
  const t = today()
  const stub = await payStub(db, t)
  if (!stub.rows.length) return { net: 0, paydayId: null }

  const { data: payday, error } = await db
    .from('q_paydays')
    .insert({ week_start: weekStart(t), gross: stub.gross, deductions: stub.deductions, decay: stub.decay, net: stub.net })
    .select('id')
    .single()
  if (error) throw error

  const ids = stub.rows.map(r => r.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { error: e } = await db
      .from('q_ledger')
      .update({ status: 'paid', payday_id: payday.id })
      .in('id', ids.slice(i, i + 200))
      .eq('status', 'pending')
    if (e) throw e
  }

  if (stub.decay) {
    await db.from('q_ledger').insert({
      amount: -stub.decay,
      status: 'paid',
      source: 'decay',
      source_id: payday.id,
      note: 'unclaimed decay',
      occurred_on: t,
      payday_id: payday.id,
    })
  }
  return { net: stub.net, paydayId: payday.id }
}

// ── review periods ──────────────────────────────────────────

export type ReviewCadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

const START: Record<ReviewCadence, (d: string) => string> = {
  weekly: weekStart,
  monthly: monthStart,
  quarterly: quarterStart,
  yearly: yearStart,
}

/** Days into a new period during which you can still review the last one. */
const CATCH_UP: Record<ReviewCadence, number> = { weekly: 2, monthly: 7, quarterly: 14, yearly: 31 }

/**
 * Which period a review right now is for: the previous one if we're early
 * in a new period and it hasn't been reviewed, otherwise the current one.
 */
export function reviewPeriod(cadence: ReviewCadence, done: Set<string>, t = today()): string {
  const current = START[cadence](t)
  const prev = START[cadence](addDays(current, -1))
  const into = Math.round((Date.parse(t) - Date.parse(current)) / 86_400_000)
  if (into < CATCH_UP[cadence] && !done.has(prev)) return prev
  return current
}
