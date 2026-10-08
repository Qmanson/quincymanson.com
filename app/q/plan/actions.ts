'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { domainOf, json, required, str } from '@/lib/q/form'
import { today } from '@/lib/q/time'
import type { QProject } from '@/lib/q/types'

function done() {
  revalidatePath('/q', 'layout')
}

// ── projects ────────────────────────────────────────────────

const STATUSES: QProject['status'][] = ['idea', 'active', 'paused', 'done', 'dropped']

function projectFields(f: FormData) {
  const status = (str(f, 'status') ?? 'active') as QProject['status']
  return {
    title: required(f, 'title', 'name'),
    domain: domainOf(f),
    status: STATUSES.includes(status) ? status : 'active',
    notes: str(f, 'notes'),
    target_date: str(f, 'target_date'),
  }
}

export const createProject = act(async function createProject(f: FormData) {
  const db = await qAction()
  const fields = projectFields(f)
  const { error } = await db.from('q_projects').insert({ ...fields, start_date: today() })
  if (error) throw error
  done()
})

export const updateProject = act(async function updateProject(id: string, f: FormData) {
  const db = await qAction()
  const fields = projectFields(f)
  const { error } = await db
    .from('q_projects')
    .update({ ...fields, done_at: fields.status === 'done' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
  done()
})

export const deleteProject = act(async function deleteProject(id: string) {
  const db = await qAction()
  // its tasks stay, just unlinked
  const { error } = await db.from('q_projects').delete().eq('id', id)
  if (error) throw error
  done()
})

// ── events ──────────────────────────────────────────────────

async function linkPeople(db: Awaited<ReturnType<typeof qAction>>, f: FormData): Promise<string[]> {
  const ids = json<string[]>(f, 'people_ids') ?? []
  const fresh = (json<string[]>(f, 'new_people') ?? []).map(n => n.trim()).filter(Boolean)
  if (fresh.length) {
    const { data } = await db.from('q_people').insert(fresh.map(name => ({ name }))).select('id')
    ids.push(...(data ?? []).map(p => p.id))
  }
  return [...new Set(ids)]
}

export const createEvent = act(async function createEvent(f: FormData) {
  const db = await qAction()
  const { data: ev, error } = await db
    .from('q_events')
    .insert({
      title: required(f, 'title', 'what'),
      domain: domainOf(f, 'crew'),
      happens_on: str(f, 'happens_on'),
      notes: str(f, 'notes'),
    })
    .select('id')
    .single()
  if (error) throw error
  const people = await linkPeople(db, f)
  if (people.length) await db.from('q_event_people').insert(people.map(person_id => ({ event_id: ev.id, person_id })))
  done()
})

export const updateEvent = act(async function updateEvent(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db
    .from('q_events')
    .update({
      title: required(f, 'title', 'what'),
      domain: domainOf(f, 'crew'),
      happens_on: str(f, 'happens_on'),
      notes: str(f, 'notes'),
    })
    .eq('id', id)
  if (error) throw error
  const people = await linkPeople(db, f)
  await db.from('q_event_people').delete().eq('event_id', id)
  if (people.length) await db.from('q_event_people').insert(people.map(person_id => ({ event_id: id, person_id })))
  done()
})

/** It happened: log it as an event (with its people) and pay out. Returns Q$. */
export const completeEvent = act(async function completeEvent(id: string) {
  const db = await qAction()
  const { data: ev, error } = await db.from('q_events').select('*').eq('id', id).single()
  if (error) throw error
  if (ev.status === 'done') return 0

  const { data: lt } = await db.from('q_log_types').select('*').eq('kind', 'event').order('created_at').limit(1).maybeSingle()
  if (!lt) throw new Error('add an “event” log type first')

  const t = today()
  const day = ev.happens_on && ev.happens_on < t ? ev.happens_on : t
  const { data: log, error: e } = await db
    .from('q_logs')
    .insert({ log_type_id: lt.id, logged_on: day, note: ev.notes, data: { title: ev.title } })
    .select('id')
    .single()
  if (e) throw e

  const { data: people } = await db.from('q_event_people').select('person_id').eq('event_id', id)
  if (people?.length) {
    await db.from('q_log_people').insert(people.map(p => ({ log_id: log.id, person_id: p.person_id })))
  }
  await db.from('q_events').update({ status: 'done', log_id: log.id, happens_on: day }).eq('id', id)
  const delta = lt.value
    ? await settle(db, { source: 'log', source_id: log.id, domain: ev.domain, note: ev.title, occurred_on: day }, lt.value)
    : 0
  done()
  return delta
})

export const skipEvent = act(async function skipEvent(id: string) {
  const db = await qAction()
  await db.from('q_events').update({ status: 'skipped' }).eq('id', id)
  done()
})

export const deleteEvent = act(async function deleteEvent(id: string) {
  const db = await qAction()
  await db.from('q_events').delete().eq('id', id)
  done()
})

/** Tasks that were really events ("solstice dinner") move over to the queue. */
export const taskToEvent = act(async function taskToEvent(taskId: string) {
  const db = await qAction()
  const { data: task, error } = await db.from('q_tasks').select('*').eq('id', taskId).single()
  if (error) throw error
  if (task.done_at) throw new Error('already done')
  const { error: e } = await db.from('q_events').insert({
    title: task.title,
    domain: task.domain,
    happens_on: task.due_date,
    notes: task.notes,
  })
  if (e) throw e
  await settle(db, { source: 'task', source_id: taskId }, 0)
  await db.from('q_tasks').delete().eq('id', taskId)
  done()
})
