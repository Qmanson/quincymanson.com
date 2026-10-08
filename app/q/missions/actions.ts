'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { addMonths, monthStart, quarterStart, today } from '@/lib/q/time'
import { checkStrikeLimit, complete, missionPeriodEnd, targetProgress } from '@/lib/q/missions'
import { DOMAINS, type Domain, type MissionKind, type SpeedTier } from '@/lib/q/types'

const KINDS: MissionKind[] = ['checklist', 'deadline', 'speed', 'streak', 'target', 'abstain']

function done() {
  revalidatePath('/q', 'layout')
}

function str(f: FormData, k: string): string | null {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function int(f: FormData, k: string): number | null {
  const v = str(f, k)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

/** "7:1000, 14:700, :400" → tiers. A blank day count = any time after. */
function parseTiers(s: string | null): SpeedTier[] | null {
  if (!s) return null
  const tiers = s.split(',').flatMap(part => {
    const [d, r] = part.split(':').map(x => x.trim())
    const reward = Number(r)
    if (!Number.isFinite(reward)) return []
    return [{ days: d ? Number(d) : null, reward }]
  })
  return tiers.length ? tiers : null
}

export const createMission = act(async function createMission(f: FormData) {
  const db = await qAction()
  const t = today()

  const title = str(f, 'title')
  if (!title) throw new Error('title is required')
  const d = str(f, 'domain')
  if (!d || !(DOMAINS as readonly string[]).includes(d)) throw new Error('Pick a domain')
  const kind = str(f, 'kind') as MissionKind
  if (!KINDS.includes(kind)) throw new Error('Pick a mission type')

  // Missions belong to this or next month / quarter.
  const period = str(f, 'period') === 'quarter' ? 'quarter' : 'month'
  const step = period === 'month' ? 1 : 3
  const current = period === 'month' ? monthStart(t) : quarterStart(t)
  const period_start = str(f, 'which') === 'next' ? addMonths(current, step) : current

  let theme_id: string | null = null
  if (f.get('themed') === 'on') {
    const { data: theme } = await db
      .from('q_themes')
      .select('id')
      .or(`and(scope.eq.quarter,period_start.eq.${quarterStart(period_start)}),and(scope.eq.year,period_start.eq.${period_start.slice(0, 4)}-01-01)`)
      .order('scope') // 'quarter' before 'year'
      .limit(1)
      .maybeSingle()
    theme_id = theme?.id ?? null
  }

  const table = str(f, 'strike_table')
  const { data: m, error } = await db
    .from('q_missions')
    .insert({
      title,
      domain: d as Domain,
      notes: str(f, 'notes'),
      period,
      period_start,
      theme_id,
      kind,
      reward: int(f, 'reward') ?? 1000,
      strike_formula: (str(f, 'strike_formula') as 'halving' | 'linear' | 'custom') ?? 'halving',
      strike_linear_pct: int(f, 'strike_linear_pct'),
      strike_table: table ? table.split(',').map(x => Math.round(Number(x.trim()))).filter(Number.isFinite) : null,
      strike_limit: int(f, 'strike_limit') ?? 3,
      due_on: str(f, 'due_on'),
      duration_days: int(f, 'duration_days'),
      streak_cadence: kind === 'streak' ? ((str(f, 'streak_cadence') as 'daily' | 'weekly') ?? 'daily') : null,
      streak_per_period: int(f, 'streak_per_period') ?? 1,
      speed_tiers: parseTiers(str(f, 'speed_tiers')),
      target_amount: Number(str(f, 'target_amount')) || null,
      target_log_type_id: str(f, 'target_log_type_id'),
    })
    .select('id')
    .single()
  if (error) throw error

  const steps = (str(f, 'steps') ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  if (steps.length) {
    await db.from('q_mission_steps').insert(steps.map((title, i) => ({ mission_id: m.id, title, sort_order: i })))
  }
  done()
})

async function getMission(id: string) {
  const db = await qAction()
  const { data: m, error } = await db.from('q_missions').select('*').eq('id', id).single()
  if (error) throw error
  return { db, m }
}

export const startMission = act(async function startMission(id: string) {
  const { db, m } = await getMission(id)
  const t = today()
  if (m.status !== 'planned') return
  if (t < m.period_start) throw new Error(`can't start before ${m.period_start}`)
  if (t > missionPeriodEnd(m)) throw new Error('this mission’s period is over')
  await db.from('q_missions').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', id)
  done()
})

/** Check in for today (streak) or add progress (target). Returns Q$ paid if it completed. */
export const checkIn = act(async function checkIn(id: string, f?: FormData): Promise<number> {
  const { db, m } = await getMission(id)
  if (m.status !== 'active') return 0
  const t = today()
  const amount = f ? Number(str(f, 'amount')) || null : null

  if (m.kind === 'streak') {
    const { data: existing } = await db
      .from('q_mission_checks')
      .select('id')
      .eq('mission_id', id)
      .eq('checked_on', t)
      .limit(1)
    // daily streaks: one per day; weekly allows several per week but still one per day
    if (existing?.length) return 0
  }

  await db.from('q_mission_checks').insert({ mission_id: id, checked_on: t, amount, note: f ? str(f, 'note') : null })

  if (m.kind === 'target' && m.target_amount && (await targetProgress(db, m)) >= Number(m.target_amount)) {
    await complete(db, m)
    done()
    const { data } = await db.from('q_missions').select('payout').eq('id', id).single()
    return data?.payout ?? 0
  }
  done()
  return 0
})

export const undoCheckIn = act(async function undoCheckIn(id: string) {
  const db = await qAction()
  const { data } = await db
    .from('q_mission_checks')
    .select('id')
    .eq('mission_id', id)
    .eq('checked_on', today())
    .order('created_at', { ascending: false })
    .limit(1)
  if (data?.length) await db.from('q_mission_checks').delete().eq('id', data[0].id)
  done()
})

export const addSlip = act(async function addSlip(id: string, f: FormData) {
  const { db, m } = await getMission(id)
  if (m.status !== 'active') return
  await db.from('q_strikes').insert({ mission_id: id, kind: 'slip', note: str(f, 'note') })
  await checkStrikeLimit(db, m)
  done()
})

export const toggleStep = act(async function toggleStep(stepId: string, on: boolean): Promise<number> {
  const db = await qAction()
  const { data: step, error } = await db.from('q_mission_steps').select('*').eq('id', stepId).single()
  if (error) throw error
  await db.from('q_mission_steps').update({ done_at: on ? new Date().toISOString() : null }).eq('id', stepId)

  // A checklist finishes itself when the last step is ticked.
  const { data: m } = await db.from('q_missions').select('*').eq('id', step.mission_id).single()
  if (on && m?.kind === 'checklist' && m.status === 'active') {
    const { count } = await db
      .from('q_mission_steps')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', m.id)
      .is('done_at', null)
    if (count === 0) {
      await complete(db, m)
      done()
      const { data } = await db.from('q_missions').select('payout').eq('id', m.id).single()
      return data?.payout ?? 0
    }
  }
  done()
  return 0
})

export const completeMission = act(async function completeMission(id: string): Promise<number> {
  const { db, m } = await getMission(id)
  if (m.status !== 'active') return 0
  await complete(db, m)
  done()
  const { data } = await db.from('q_missions').select('payout').eq('id', id).single()
  return data?.payout ?? 0
})

export const abandonMission = act(async function abandonMission(id: string) {
  const { db, m } = await getMission(id)
  if (m.status !== 'planned' && m.status !== 'active') return
  await db.from('q_missions').update({ status: 'abandoned', completed_at: new Date().toISOString() }).eq('id', id)
  done()
})

export const deleteMission = act(async function deleteMission(id: string) {
  const { db, m } = await getMission(id)
  if (m.status !== 'planned') throw new Error('only planned missions can be deleted')
  await db.from('q_missions').delete().eq('id', id)
  done()
})
