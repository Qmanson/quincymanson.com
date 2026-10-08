'use server'

import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { lateValue, missPenalty, TASK_SIZES } from '@/lib/q/points'
import { periodStart, today } from '@/lib/q/time'
import { DOMAINS, type Cadence, type Domain } from '@/lib/q/types'

function done() {
  revalidatePath('/q', 'layout')
}

// ── form parsing ────────────────────────────────────────────

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

function num(f: FormData, k: string): number | null {
  const v = str(f, k)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function domain(f: FormData): Domain {
  const d = str(f, 'domain')
  if (!d || !(DOMAINS as readonly string[]).includes(d)) throw new Error('Pick a domain')
  return d as Domain
}

function required(f: FormData, k: string): string {
  const v = str(f, k)
  if (!v) throw new Error(`${k} is required`)
  return v
}

// ── routines ────────────────────────────────────────────────

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'interval']

export async function createRoutine(f: FormData) {
  const db = await qAction()
  const cadence = str(f, 'cadence') as Cadence
  if (!CADENCES.includes(cadence)) throw new Error('Pick a cadence')
  const { error } = await db.from('q_routines').insert({
    domain: domain(f),
    title: required(f, 'title'),
    cadence,
    interval_days: cadence === 'interval' ? int(f, 'interval_days') ?? 7 : null,
    value: int(f, 'value') ?? 10,
    miss_penalty: int(f, 'miss_penalty'),
    starts_on: today(),
    notes: str(f, 'notes'),
  })
  if (error) throw error
  done()
}

export async function updateRoutine(id: string, f: FormData) {
  const db = await qAction()
  const cadence = str(f, 'cadence') as Cadence
  if (!CADENCES.includes(cadence)) throw new Error('Pick a cadence')
  const { error } = await db.from('q_routines').update({
    domain: domain(f),
    title: required(f, 'title'),
    cadence,
    interval_days: cadence === 'interval' ? int(f, 'interval_days') ?? 7 : null,
    value: int(f, 'value') ?? 10,
    miss_penalty: int(f, 'miss_penalty'),
    notes: str(f, 'notes'),
  }).eq('id', id)
  if (error) throw error
  done()
}

export async function setRoutineActive(id: string, active: boolean) {
  const db = await qAction()
  // Re-activating starts fresh today so the paused stretch isn't penalised.
  const { error } = await db
    .from('q_routines')
    .update(active ? { active, starts_on: today() } : { active })
    .eq('id', id)
  if (error) throw error
  done()
}

/** Check / uncheck a routine for its current period. Returns the Q$ change. */
export async function toggleRoutine(id: string, on: boolean): Promise<number> {
  const db = await qAction()
  const { data: r, error } = await db.from('q_routines').select('*').eq('id', id).single()
  if (error) throw error
  const t = today()
  const p = r.cadence === 'interval' ? t : periodStart(r.cadence, t)
  const entry = { source: 'routine' as const, domain: r.domain, note: r.title, occurred_on: t }

  const { data: existing } = await db
    .from('q_routine_checks')
    .select('id, status')
    .eq('routine_id', id)
    .eq('period_start', p)
    .maybeSingle()

  if (on) {
    let checkId = existing?.id
    if (existing) {
      if (existing.status === 'done') return 0
      await db.from('q_routine_checks').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      const { data: c, error: e } = await db
        .from('q_routine_checks')
        .insert({ routine_id: id, period_start: p, status: 'done', done_at: new Date().toISOString() })
        .select('id')
        .single()
      if (e) throw e
      checkId = c.id
    }
    await settle(db, { ...entry, source_id: checkId! }, r.value)
    done()
    return r.value
  }

  if (!existing || existing.status !== 'done') return 0
  await settle(db, { ...entry, source_id: existing.id }, 0)
  await db.from('q_routine_checks').delete().eq('id', existing.id)
  done()
  return -r.value
}

/** Do a missed routine after the fact: penalty is replaced by half value. */
export async function doLate(checkId: string): Promise<number> {
  const db = await qAction()
  const { data: c, error } = await db
    .from('q_routine_checks')
    .select('id, status, routine_id')
    .eq('id', checkId)
    .single()
  if (error) throw error
  if (c.status !== 'missed') return 0
  const { data: r } = await db.from('q_routines').select('*').eq('id', c.routine_id).single()
  if (!r) return 0
  await db.from('q_routine_checks').update({ status: 'late', done_at: new Date().toISOString() }).eq('id', c.id)
  const late = lateValue(r)
  await settle(db, { source: 'routine', source_id: c.id, domain: r.domain, note: `late · ${r.title}` }, late)
  done()
  return late + missPenalty(r)
}

// ── tasks ───────────────────────────────────────────────────

export async function createTask(f: FormData) {
  const db = await qAction()
  const size = str(f, 'size') as keyof typeof TASK_SIZES | null
  const value = int(f, 'value') ?? (size && size in TASK_SIZES ? TASK_SIZES[size] : TASK_SIZES.S)
  const { error } = await db.from('q_tasks').insert({
    domain: domain(f),
    title: required(f, 'title'),
    notes: str(f, 'notes'),
    value,
    due_date: str(f, 'due_date'),
    project_id: str(f, 'project_id'),
  })
  if (error) throw error
  done()
}

export async function updateTask(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_tasks').update({
    domain: domain(f),
    title: required(f, 'title'),
    notes: str(f, 'notes'),
    value: int(f, 'value') ?? TASK_SIZES.S,
    due_date: str(f, 'due_date'),
    project_id: str(f, 'project_id'),
  }).eq('id', id)
  if (error) throw error
  done()
}

export async function toggleTask(id: string, on: boolean): Promise<number> {
  const db = await qAction()
  const { data: t, error } = await db.from('q_tasks').select('*').eq('id', id).single()
  if (error) throw error
  if (!!t.done_at === on) return 0
  await db.from('q_tasks').update({ done_at: on ? new Date().toISOString() : null }).eq('id', id)
  await settle(db, { source: 'task', source_id: id, domain: t.domain, note: t.title }, on ? t.value : 0)
  done()
  return on ? t.value : -t.value
}

export async function deleteTask(id: string) {
  const db = await qAction()
  const { data: t } = await db.from('q_tasks').select('domain, title').eq('id', id).single()
  if (t) await settle(db, { source: 'task', source_id: id, domain: t.domain }, 0)
  await db.from('q_tasks').delete().eq('id', id)
  done()
}

// ── logs ────────────────────────────────────────────────────

export async function createLogType(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_log_types').insert({
    domain: domain(f),
    name: required(f, 'name'),
    unit: str(f, 'unit'),
    value: int(f, 'value') ?? 0,
    icon: str(f, 'icon'),
  })
  if (error) throw error
  done()
}

export async function updateLogType(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_log_types').update({
    domain: domain(f),
    name: required(f, 'name'),
    unit: str(f, 'unit'),
    value: int(f, 'value') ?? 0,
    icon: str(f, 'icon'),
  }).eq('id', id)
  if (error) throw error
  done()
}

export async function setLogTypeActive(id: string, active: boolean) {
  const db = await qAction()
  await db.from('q_log_types').update({ active }).eq('id', id)
  done()
}

export async function addLog(f: FormData): Promise<number> {
  const db = await qAction()
  const typeId = required(f, 'log_type_id')
  const { data: lt, error } = await db.from('q_log_types').select('*').eq('id', typeId).single()
  if (error) throw error
  const logged_on = str(f, 'logged_on') ?? today()
  const { data: log, error: e } = await db
    .from('q_logs')
    .insert({ log_type_id: typeId, logged_on, amount: num(f, 'amount'), note: str(f, 'note') })
    .select('id')
    .single()
  if (e) throw e
  if (lt.value) {
    await settle(db, { source: 'log', source_id: log.id, domain: lt.domain, note: lt.name, occurred_on: logged_on }, lt.value)
  }
  done()
  return lt.value
}

export async function deleteLog(id: string) {
  const db = await qAction()
  await settle(db, { source: 'log', source_id: id }, 0)
  await db.from('q_logs').delete().eq('id', id)
  done()
}
