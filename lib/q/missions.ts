import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { QMission, QMissionCheck, SpeedTier } from './types'
import { addDays, addMonths, dateOf, daysBetween, today } from './time'
import { applyStrikes, speedReward, THEME_BONUS } from './points'
import { add } from './ledger'

type DB = SupabaseClient<Database>

// ── shape helpers (pure) ────────────────────────────────────

export function missionPeriodEnd(m: Pick<QMission, 'period' | 'period_start'>): string {
  return addDays(addMonths(m.period_start, m.period === 'month' ? 1 : 3), -1)
}

export function startDate(m: QMission): string | null {
  return m.started_at ? dateOf(m.started_at) : null
}

export function tiers(m: QMission): SpeedTier[] {
  return Array.isArray(m.speed_tiers) ? (m.speed_tiers as SpeedTier[]) : []
}

/** Last day the mission can still be worked on, or null if open-ended. */
export function endDate(m: QMission): string | null {
  const s = startDate(m)
  switch (m.kind) {
    case 'streak':
    case 'abstain':
      return s && m.duration_days ? addDays(s, m.duration_days - 1) : null
    case 'deadline':
      return m.due_on
    case 'target':
      return m.due_on ?? missionPeriodEnd(m)
    case 'speed': {
      const ts = tiers(m)
      if (!s || !ts.length || ts.some(t => t.days === null)) return null
      return addDays(s, Math.max(...ts.map(t => t.days as number)) - 1)
    }
    case 'checklist':
      return null
  }
}

/** Streak check-in windows: [start, end] pairs. */
export function streakPeriods(m: QMission): [string, string][] {
  const s = startDate(m)
  if (!s || !m.duration_days) return []
  const step = m.streak_cadence === 'weekly' ? 7 : 1
  const out: [string, string][] = []
  for (let i = 0; i < m.duration_days; i += step) {
    out.push([addDays(s, i), addDays(s, Math.min(i + step, m.duration_days) - 1)])
  }
  return out
}

/** Base reward for finishing now, before strikes. null = too slow (speed). */
function baseReward(m: QMission, t: string): number | null {
  if (m.kind !== 'speed') return m.reward
  const s = startDate(m)
  if (!s) return null
  return speedReward(tiers(m), daysBetween(s, t) + 1)
}

function withTheme(m: QMission, n: number): number {
  return m.theme_id ? Math.round(n * THEME_BONUS) : n
}

// ── db ──────────────────────────────────────────────────────

async function strikeCount(db: DB, id: string): Promise<number> {
  const { count, error } = await db
    .from('q_strikes')
    .select('id', { count: 'exact', head: true })
    .eq('mission_id', id)
  if (error) throw error
  return count ?? 0
}

export async function targetProgress(db: DB, m: QMission): Promise<number> {
  const s = startDate(m)
  if (!s) return 0
  const { data: checks } = await db.from('q_mission_checks').select('amount').eq('mission_id', m.id)
  let total = (checks ?? []).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
  if (m.target_log_type_id) {
    const end = endDate(m) ?? today()
    const { data: logs } = await db
      .from('q_logs')
      .select('amount')
      .eq('log_type_id', m.target_log_type_id)
      .gte('logged_on', s)
      .lte('logged_on', end)
    total += (logs ?? []).reduce((sum, l) => sum + Number(l.amount ?? 0), 0)
  }
  return total
}

/** Close a mission out and pay instantly (missions skip payday). */
export async function finish(db: DB, m: QMission, status: 'passed' | 'failed', payout: number) {
  const { data, error } = await db
    .from('q_missions')
    .update({ status, payout, completed_at: new Date().toISOString() })
    .eq('id', m.id)
    .eq('status', 'active') // guards against double payout
    .select('id')
  if (error) throw error
  if (data.length && payout > 0) {
    await add(db, { source: 'mission', source_id: m.id, domain: m.domain, note: `mission · ${m.title}` }, payout, 'paid')
  }
}

/** Manually completing a checklist / deadline / speed mission. */
export async function complete(db: DB, m: QMission) {
  const t = today()
  const strikes = await strikeCount(db, m.id)
  const base = baseReward(m, t)
  if (base === null || strikes >= m.strike_limit) return finish(db, m, 'failed', 0)
  if (m.kind === 'target') {
    const progress = await targetProgress(db, m)
    const share = m.target_amount ? Math.min(1, progress / Number(m.target_amount)) : 1
    return finish(db, m, 'passed', withTheme(m, applyStrikes(m, Math.round(base * share), strikes)))
  }
  return finish(db, m, 'passed', withTheme(m, applyStrikes(m, base, strikes)))
}

/** Fail immediately if the strike limit was hit (after a slip, say). */
export async function checkStrikeLimit(db: DB, m: QMission) {
  if ((await strikeCount(db, m.id)) >= m.strike_limit) await finish(db, m, 'failed', 0)
}

/** Part of close-out: abandon stale plans, add streak strikes, settle ended missions. */
export async function closeMissions(db: DB, t: string) {
  const { data: missions, error } = await db.from('q_missions').select('*').in('status', ['planned', 'active'])
  if (error) throw error

  for (const m of missions) {
    if (m.status === 'planned') {
      if (missionPeriodEnd(m) < t) await db.from('q_missions').update({ status: 'abandoned' }).eq('id', m.id)
      continue
    }

    if (m.kind === 'streak') await addStreakStrikes(db, m, t)

    const strikes = await strikeCount(db, m.id)
    if (strikes >= m.strike_limit) {
      await finish(db, m, 'failed', 0)
      continue
    }

    const end = endDate(m)
    if (!end || end >= t) continue

    // The mission's window has closed.
    switch (m.kind) {
      case 'streak':
      case 'abstain':
        await finish(db, m, 'passed', withTheme(m, applyStrikes(m, m.reward, strikes)))
        break
      case 'target': {
        const progress = await targetProgress(db, m)
        const share = m.target_amount ? Math.min(1, progress / Number(m.target_amount)) : 0
        const payout = withTheme(m, applyStrikes(m, Math.round(m.reward * share), strikes))
        await finish(db, m, payout > 0 ? 'passed' : 'failed', payout)
        break
      }
      case 'deadline':
      case 'speed':
        await finish(db, m, 'failed', 0)
        break
    }
  }
}

async function addStreakStrikes(db: DB, m: QMission, t: string) {
  const periods = streakPeriods(m).filter(([, end]) => end < t)
  if (!periods.length) return

  const [{ data: checks }, { data: strikes }] = await Promise.all([
    db.from('q_mission_checks').select('checked_on').eq('mission_id', m.id),
    db.from('q_strikes').select('period_start').eq('mission_id', m.id).eq('kind', 'miss'),
  ])
  const struck = new Set((strikes ?? []).map(s => s.period_start))
  const days = (checks ?? []).map((c: Pick<QMissionCheck, 'checked_on'>) => c.checked_on)

  for (const [start, end] of periods) {
    if (struck.has(start)) continue
    const n = days.filter(d => d >= start && d <= end).length
    if (n >= m.streak_per_period) continue
    const { error } = await db.from('q_strikes').insert({ mission_id: m.id, kind: 'miss', period_start: start })
    if (error && error.code !== '23505') throw error // 23505 = already struck
  }
}

// ── view model ──────────────────────────────────────────────

export type MissionView = {
  /** 0–1 */
  pct: number
  label: string
  strikes: number
  /** What finishing right now would pay (after strikes + theme). */
  payoutNow: number
  checkedToday: boolean
  daysLeft: number | null
  steps: { id: string; title: string; done: boolean }[]
}

export async function loadMissionViews(db: DB, missions: QMission[]): Promise<Map<string, MissionView>> {
  const out = new Map<string, MissionView>()
  if (!missions.length) return out
  const ids = missions.map(m => m.id)
  const t = today()

  const [{ data: checks }, { data: strikes }, { data: steps }] = await Promise.all([
    db.from('q_mission_checks').select('mission_id, checked_on, amount').in('mission_id', ids),
    db.from('q_strikes').select('mission_id').in('mission_id', ids),
    db.from('q_mission_steps').select('*').in('mission_id', ids).order('sort_order'),
  ])

  for (const m of missions) {
    const mc = (checks ?? []).filter(c => c.mission_id === m.id)
    const ms = (strikes ?? []).filter(s => s.mission_id === m.id).length
    const st = (steps ?? []).filter(s => s.mission_id === m.id)
    const s = startDate(m)
    const end = endDate(m)
    const daysLeft = end ? daysBetween(t, end) : null

    let pct = 0
    let label = ''
    let base: number = m.reward

    switch (m.kind) {
      case 'streak': {
        const ps = streakPeriods(m)
        const hit = ps.filter(([a, b]) => mc.filter(c => c.checked_on >= a && c.checked_on <= b).length >= m.streak_per_period).length
        pct = ps.length ? hit / ps.length : 0
        label = `${hit}/${ps.length} ${m.streak_cadence === 'weekly' ? 'weeks' : 'days'}`
        break
      }
      case 'abstain': {
        const elapsed = s ? Math.min(daysBetween(s, t) + 1, m.duration_days ?? 0) : 0
        pct = m.duration_days ? elapsed / m.duration_days : 0
        label = `day ${elapsed}/${m.duration_days ?? '?'}`
        break
      }
      case 'target': {
        const prog = await targetProgress(db, m)
        const target = Number(m.target_amount ?? 0)
        pct = target ? Math.min(1, prog / target) : 0
        base = Math.round(m.reward * pct)
        label = `${+prog.toFixed(2)}/${target}`
        break
      }
      case 'checklist':
      case 'deadline': {
        const n = st.filter(x => x.done_at).length
        pct = st.length ? n / st.length : 0
        label = st.length ? `${n}/${st.length} steps` : m.kind === 'deadline' && m.due_on ? `due ${m.due_on}` : 'open'
        break
      }
      case 'speed': {
        const n = st.filter(x => x.done_at).length
        pct = st.length ? n / st.length : 0
        base = baseReward(m, t) ?? 0
        label = s ? `day ${daysBetween(s, t) + 1}` : ''
        break
      }
    }

    out.set(m.id, {
      pct,
      label,
      strikes: ms,
      payoutNow: m.status === 'active' ? withTheme(m, applyStrikes(m, base, ms)) : m.payout ?? 0,
      checkedToday: mc.some(c => c.checked_on === t),
      daysLeft,
      steps: st.map(x => ({ id: x.id, title: x.title, done: !!x.done_at })),
    })
  }
  return out
}
