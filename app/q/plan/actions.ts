'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { domainOf, json, required, str } from '@/lib/q/form'
import { EVENT_VALUE, HANG_VALUE } from '@/lib/q/points'
import { today } from '@/lib/q/time'
import type { QPerson, QProject } from '@/lib/q/types'

function done() {
  revalidatePath('/q', 'layout')
}

type DB = Awaited<ReturnType<typeof qAction>>

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
  const { data, error } = await db.from('q_projects').insert({ ...projectFields(f), start_date: today() }).select('id').single()
  if (error) throw error
  done()
  return data.id
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

// ── hangs & events ──────────────────────────────────────────
// Hangs: friends (crew). Events: something an organization puts on (city).
// Both can be queued ahead of time or logged after.

/** Add a dated note to the bottom of a person's or org's file. */
async function appendTo(db: DB, table: 'q_people' | 'q_orgs', id: string, header: string, note: string) {
  const { data } = await db.from(table).select('notes').eq('id', id).single()
  const prev = data?.notes?.trimEnd() ?? ''
  const next = `${prev ? prev + '\n\n' : ''}${header}\n${note.trim()}`
  await db.from(table).update({ notes: next }).eq('id', id)
}

const gatheringValue = (kind: 'hang' | 'event') => (kind === 'hang' ? HANG_VALUE : EVENT_VALUE)

/**
 * Create or update a hang / event. Form fields:
 *  kind, title, happens_on, happened ('on' = it already happened), tags,
 *  notes, people_ids / new_people (JSON), note_<personId> / note_new_<name>,
 *  org_id or new_org, org_note.
 * Returns the Q$ change.
 */
export const saveGathering = act(async function saveGathering(id: string | null, f: FormData) {
  const db = await qAction()
  const kind: 'hang' | 'event' = str(f, 'kind') === 'hang' ? 'hang' : 'event'
  const title = required(f, 'title', 'what')
  const happened = f.get('happened') === 'on'
  const t = today()
  const happens_on = str(f, 'happens_on') ?? (happened ? t : null)

  // organization (events only)
  let org_id: string | null = kind === 'event' ? str(f, 'org_id') : null
  const newOrg = kind === 'event' ? str(f, 'new_org') : null
  if (newOrg) {
    const { data: o, error } = await db.from('q_orgs').insert({ name: newOrg }).select('id').single()
    if (error) throw error
    org_id = o.id
  }

  const fields = {
    kind,
    title,
    happens_on,
    domain: kind === 'hang' ? ('crew' as const) : ('city' as const),
    org_id,
    tags: (str(f, 'tags') ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
    notes: str(f, 'notes'),
    status: happened ? ('done' as const) : ('planned' as const),
  }

  let evId: string
  if (id) {
    const { data: prev } = await db.from('q_events').select('done_at').eq('id', id).single()
    const { error } = await db
      .from('q_events')
      .update({ ...fields, done_at: happened ? prev?.done_at ?? new Date().toISOString() : null })
      .eq('id', id)
    if (error) throw error
    evId = id
  } else {
    const { data: ev, error } = await db
      .from('q_events')
      .insert({ ...fields, done_at: happened ? new Date().toISOString() : null })
      .select('id')
      .single()
    if (error) throw error
    evId = ev.id
  }

  // people: existing picks + brand-new names
  const ids = json<string[]>(f, 'people_ids') ?? []
  const fresh = (json<string[]>(f, 'new_people') ?? []).map(n => n.trim()).filter(Boolean)
  const freshIds = new Map<string, string>()
  if (fresh.length) {
    const { data } = await db.from('q_people').insert(fresh.map(name => ({ name }))).select('id, name')
    for (const p of data ?? []) freshIds.set(p.name, p.id)
  }
  const { data: before } = await db.from('q_event_people').select('person_id, note').eq('event_id', evId)
  const oldNote = new Map((before ?? []).map(b => [b.person_id, b.note]))
  const people = [
    ...ids.map(pid => ({ pid, note: str(f, `note_${pid}`) })),
    ...fresh.map(name => ({ pid: freshIds.get(name) ?? '', note: str(f, `note_new_${name}`) })),
  ].filter(x => x.pid)

  await db.from('q_event_people').delete().eq('event_id', evId)
  if (people.length) {
    await db.from('q_event_people').insert(people.map(x => ({ event_id: evId, person_id: x.pid, note: x.note })))
  }
  // new or changed notes go to the bottom of each person's file
  const header = `— ${happens_on ?? t} · ${title}`
  for (const x of people) {
    if (x.note && x.note !== oldNote.get(x.pid)) await appendTo(db, 'q_people', x.pid, header, x.note)
  }
  const orgNote = str(f, 'org_note')
  if (org_id && orgNote) await appendTo(db, 'q_orgs', org_id, header, orgNote)

  const delta = await settle(
    db,
    { source: 'event', source_id: evId, domain: fields.domain, note: `${kind} · ${title}`, occurred_on: happens_on ?? t },
    happened ? gatheringValue(kind) : 0,
  )
  done()
  return delta
})

/** One tap: it happened. Returns Q$. */
export const completeEvent = act(async function completeEvent(id: string) {
  const db = await qAction()
  const { data: ev, error } = await db.from('q_events').select('*').eq('id', id).single()
  if (error) throw error
  if (ev.status === 'done') return 0
  const t = today()
  const day = ev.happens_on && ev.happens_on < t ? ev.happens_on : t
  await db.from('q_events').update({ status: 'done', happens_on: day, done_at: new Date().toISOString() }).eq('id', id)
  const delta = await settle(
    db,
    { source: 'event', source_id: id, domain: ev.domain, note: `${ev.kind} · ${ev.title}`, occurred_on: day },
    gatheringValue(ev.kind),
  )
  done()
  return delta
})

/** Undo "it happened" — back to the queue. */
export const reopenEvent = act(async function reopenEvent(id: string) {
  const db = await qAction()
  await db.from('q_events').update({ status: 'planned', done_at: null }).eq('id', id)
  const delta = await settle(db, { source: 'event', source_id: id }, 0)
  done()
  return delta
})

export const skipEvent = act(async function skipEvent(id: string) {
  const db = await qAction()
  await db.from('q_events').update({ status: 'skipped' }).eq('id', id)
  await settle(db, { source: 'event', source_id: id }, 0)
  done()
})

export const deleteEvent = act(async function deleteEvent(id: string) {
  const db = await qAction()
  await settle(db, { source: 'event', source_id: id }, 0)
  await db.from('q_events').delete().eq('id', id)
  done()
})

/** Tasks that were really hangs/events move over to the queue. */
export const taskToEvent = act(async function taskToEvent(taskId: string) {
  const db = await qAction()
  const { data: task, error } = await db.from('q_tasks').select('*').eq('id', taskId).single()
  if (error) throw error
  if (task.done_at) throw new Error('already done')
  const kind: 'hang' | 'event' = task.domain === 'city' ? 'event' : 'hang'
  const { error: e } = await db.from('q_events').insert({
    kind,
    title: task.title,
    domain: kind === 'hang' ? 'crew' : 'city',
    happens_on: task.due_date,
    notes: task.notes,
  })
  if (e) throw e
  await settle(db, { source: 'task', source_id: taskId }, 0)
  await db.from('q_tasks').delete().eq('id', taskId)
  done()
})

// ── people & organizations ──────────────────────────────────

const CIRCLES: QPerson['circle'][] = ['partner', 'family', 'friend', 'other']

export const savePerson = act(async function savePerson(id: string | null, f: FormData) {
  const db = await qAction()
  const circle = (str(f, 'circle') ?? 'friend') as QPerson['circle']
  const fields = {
    name: required(f, 'name'),
    circle: CIRCLES.includes(circle) ? circle : 'friend',
    notes: str(f, 'notes'),
    birthday: str(f, 'birthday'),
  }
  const { error } = id ? await db.from('q_people').update(fields).eq('id', id) : await db.from('q_people').insert(fields)
  if (error) throw error
  done()
})

export const deletePerson = act(async function deletePerson(id: string) {
  const db = await qAction()
  await db.from('q_people').delete().eq('id', id)
  done()
})

export const saveOrg = act(async function saveOrg(id: string | null, f: FormData) {
  const db = await qAction()
  const fields = { name: required(f, 'name'), url: str(f, 'url'), notes: str(f, 'notes') }
  const { error } = id ? await db.from('q_orgs').update(fields).eq('id', id) : await db.from('q_orgs').insert(fields)
  if (error) throw error
  done()
})

export const deleteOrg = act(async function deleteOrg(id: string) {
  const db = await qAction()
  await db.from('q_orgs').delete().eq('id', id)
  done()
})

/** Quick add to the bottom of a person's / org's file. */
export const appendNote = act(async function appendNote(table: 'person' | 'org', id: string, f: FormData) {
  const db = await qAction()
  const note = required(f, 'note')
  await appendTo(db, table === 'person' ? 'q_people' : 'q_orgs', id, `— ${today()}`, note)
  done()
})
