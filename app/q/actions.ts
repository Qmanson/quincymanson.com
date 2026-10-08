'use server'

import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { lateValue, missPenalty, TASK_SIZES } from '@/lib/q/points'
import { periodStart, today } from '@/lib/q/time'
import { BUCKET, saveMedia, type MediaHit } from '@/lib/q/media'
import type { Database } from '@/lib/types'
import { DOMAINS, LOG_KINDS, type Cadence, type Domain, type LiftSet, type LogKind } from '@/lib/q/types'

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

function logKind(f: FormData): LogKind {
  const k = str(f, 'kind') ?? 'basic'
  return (LOG_KINDS as readonly string[]).includes(k) ? (k as LogKind) : 'basic'
}

export async function createLogType(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_log_types').insert({
    domain: domain(f),
    name: required(f, 'name'),
    kind: logKind(f),
    unit: str(f, 'unit'),
    value: int(f, 'value') ?? 0,
  })
  if (error) throw error
  done()
}

export async function updateLogType(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_log_types').update({
    domain: domain(f),
    name: required(f, 'name'),
    kind: logKind(f),
    unit: str(f, 'unit'),
    value: int(f, 'value') ?? 0,
  }).eq('id', id)
  if (error) throw error
  done()
}

export async function setLogTypeActive(id: string, active: boolean) {
  const db = await qAction()
  await db.from('q_log_types').update({ active }).eq('id', id)
  done()
}

function json<T>(f: FormData, k: string): T | null {
  const v = str(f, k)
  if (!v) return null
  try { return JSON.parse(v) as T } catch { return null }
}

/** "1:02:03", "42:10" or "42" (minutes) → seconds. */
function duration(v: string | null): number | null {
  if (!v) return null
  const parts = v.split(':').map(Number)
  if (parts.some(n => !Number.isFinite(n))) return null
  if (parts.length === 1) return Math.round(parts[0] * 60)
  return Math.round(parts.reduce((s, n) => s * 60 + n, 0))
}

function tags(f: FormData): string[] {
  return [...new Set((str(f, 'tags') ?? '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))]
}

export async function addLog(f: FormData): Promise<number> {
  const db = await qAction()
  const typeId = required(f, 'log_type_id')
  const { data: lt, error } = await db.from('q_log_types').select('*').eq('id', typeId).single()
  if (error) throw error
  const logged_on = str(f, 'logged_on') ?? today()

  const row: Database['public']['Tables']['q_logs']['Insert'] = {
    log_type_id: typeId,
    logged_on,
    amount: num(f, 'amount'),
    note: str(f, 'note'),
    tags: tags(f),
  }

  switch (lt.kind) {
    case 'run':
      row.note = null
      row.data = { seconds: duration(str(f, 'time')) }
      break
    case 'lift': {
      const sets = (json<LiftSet[]>(f, 'sets') ?? []).filter(s => s.workout?.trim())
      if (!sets.length) throw new Error('add at least one workout')
      const names = [...new Set(sets.map(s => s.workout.trim().toLowerCase()))]
      await db.from('q_workouts').upsert(names.map(name => ({ name })), { onConflict: 'name', ignoreDuplicates: true })
      row.amount = null
      row.note = null
      row.data = { sets: sets.map(s => ({ ...s, workout: s.workout.trim().toLowerCase() })) }
      break
    }
    case 'substance': {
      const picked = f.getAll('substances').filter((v): v is string => typeof v === 'string')
      if (!picked.length) throw new Error('pick at least one')
      row.amount = null
      row.data = { substances: picked }
      break
    }
    case 'movie':
    case 'book':
    case 'album': {
      const hit = json<MediaHit>(f, 'media')
      if (!hit) throw new Error(`pick a ${lt.kind}`)
      row.media_id = await saveMedia(db, { ...hit, kind: lt.kind })
      row.rating = num(f, 'rating')
      row.amount = null
      break
    }
    case 'event':
      row.amount = null
      row.data = { title: str(f, 'title') }
      break
    case 'photo':
      row.photo_path = str(f, 'photo_path')
      if (!row.photo_path) throw new Error('add a photo')
      row.amount = null
      break
  }

  const { data: log, error: e } = await db.from('q_logs').insert(row).select('id').single()
  if (e) throw e

  if (lt.kind === 'event') {
    const ids = json<string[]>(f, 'people_ids') ?? []
    const newNames = (json<string[]>(f, 'new_people') ?? []).map(n => n.trim()).filter(Boolean)
    if (newNames.length) {
      const { data: made } = await db.from('q_people').insert(newNames.map(name => ({ name }))).select('id')
      ids.push(...(made ?? []).map(p => p.id))
    }
    if (ids.length) {
      await db.from('q_log_people').insert([...new Set(ids)].map(person_id => ({ log_id: log.id, person_id })))
    }
  }

  if (lt.value) {
    await settle(db, { source: 'log', source_id: log.id, domain: lt.domain, note: lt.name, occurred_on: logged_on }, lt.value)
  }
  done()
  return lt.value
}

export async function deleteLog(id: string) {
  const db = await qAction()
  const { data: log } = await db.from('q_logs').select('photo_path').eq('id', id).maybeSingle()
  if (log?.photo_path) await db.storage.from(BUCKET).remove([log.photo_path])
  await settle(db, { source: 'log', source_id: id }, 0)
  await db.from('q_logs').delete().eq('id', id)
  done()
}

/** Suggestions for the log sheet: known workouts, people and tags. */
export async function logFormData(logTypeId: string) {
  const db = await qAction()
  const [{ data: workouts }, { data: people }, { data: recent }] = await Promise.all([
    db.from('q_workouts').select('name').order('name'),
    db.from('q_people').select('id, name').order('name'),
    db.from('q_logs').select('tags').eq('log_type_id', logTypeId).order('created_at', { ascending: false }).limit(200),
  ])
  const counts = new Map<string, number>()
  for (const r of recent ?? []) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return {
    workouts: (workouts ?? []).map(w => w.name),
    people: people ?? [],
    tags: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t),
  }
}
