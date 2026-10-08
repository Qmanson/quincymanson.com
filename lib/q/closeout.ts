import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { QRoutine } from './types'
import { addDays, nextPeriodStart, periodEnd, periodStart, today } from './time'
import { missPenalty } from './points'
import { closeMissions } from './missions'

type DB = SupabaseClient<Database>

const LAST_CLOSED = 'last_closed_on'
// Re-scan a little before the last close-out; inserts are idempotent.
const OVERLAP_DAYS = 7
// Never reach further back than this on the very first run.
const MAX_LOOKBACK_DAYS = 31

/**
 * Lazy close-out, run whenever q is opened. Walks every period that has
 * ended since the last run and records misses (with their penalties) and
 * mission strikes. Safe to call repeatedly — nothing is counted twice.
 */
export async function closeOut(db: DB) {
  const t = today()
  const { data: state } = await db.from('q_state').select('value').eq('key', LAST_CLOSED).maybeSingle()
  if (state?.value === t) return

  const floor = state?.value ? addDays(state.value, -OVERLAP_DAYS) : addDays(t, -MAX_LOOKBACK_DAYS)
  await closeRoutines(db, t, floor)
  await closeMissions(db, t)

  await db.from('q_state').upsert({ key: LAST_CLOSED, value: t, updated_at: new Date().toISOString() })
}

type Missed = { routine: QRoutine; period_start: string; closed_on: string }

async function closeRoutines(db: DB, t: string, floor: string) {
  const { data: routines, error } = await db.from('q_routines').select('*').eq('active', true)
  if (error) throw error

  const missed: Missed[] = []

  for (const r of routines) {
    const from = r.starts_on > floor ? r.starts_on : floor

    if (r.cadence === 'interval') {
      if (!r.interval_days) continue
      const { data: last } = await db
        .from('q_routine_checks')
        .select('period_start')
        .eq('routine_id', r.id)
        .in('status', ['done', 'late'])
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      const anchor = last?.period_start ?? r.starts_on
      // Each full interval that passes overdue is one miss.
      for (let due = addDays(anchor, r.interval_days); due < t; due = addDays(due, r.interval_days)) {
        if (due >= from) missed.push({ routine: r, period_start: due, closed_on: due })
      }
      continue
    }

    // First full period that starts on/after `from`.
    let p = periodStart(r.cadence, from)
    if (p < from) p = nextPeriodStart(r.cadence, p)
    for (; periodEnd(r.cadence, p) < t; p = nextPeriodStart(r.cadence, p)) {
      missed.push({ routine: r, period_start: p, closed_on: periodEnd(r.cadence, p) })
    }
  }

  if (!missed.length) return

  // Periods that already have a check (done / late / missed) are skipped by
  // the unique constraint; only genuinely new misses come back.
  const { data: inserted, error: insErr } = await db
    .from('q_routine_checks')
    .upsert(
      missed.map(m => ({ routine_id: m.routine.id, period_start: m.period_start, status: 'missed' as const })),
      { onConflict: 'routine_id,period_start', ignoreDuplicates: true },
    )
    .select('id, routine_id, period_start')
  if (insErr) throw insErr
  if (!inserted.length) return

  const byKey = new Map(missed.map(m => [`${m.routine.id}|${m.period_start}`, m]))
  const rows = inserted.flatMap(c => {
    const m = byKey.get(`${c.routine_id}|${c.period_start}`)
    if (!m) return []
    const penalty = missPenalty(m.routine)
    if (!penalty) return []
    return [{
      amount: -penalty,
      source: 'routine' as const,
      source_id: c.id,
      domain: m.routine.domain,
      note: `missed · ${m.routine.title}`,
      occurred_on: m.closed_on,
    }]
  })
  if (rows.length) {
    const { error: ledErr } = await db.from('q_ledger').insert(rows)
    if (ledErr) throw ledErr
  }
}
