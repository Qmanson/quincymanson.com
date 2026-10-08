import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { Domain, QEvent, QProject, QShift } from './types'
import { addDays, today, weekStart } from './time'

type DB = SupabaseClient<Database>

// Return shapes match the client components' props (EventRow, ProjectRow, WorkData).

export async function loadPeople(db: DB) {
  const { data } = await db.from('q_people').select('id, name').order('name')
  return data ?? []
}

/** Planned events (optionally one domain / only up to a date) with their people. */
export async function loadEvents(db: DB, opts: { domain?: Domain; until?: string } = {}) {
  let q = db.from('q_events').select('*').eq('status', 'planned')
  if (opts.domain) q = q.eq('domain', opts.domain)
  if (opts.until) q = q.lte('happens_on', opts.until)
  const { data: events } = await q
  const list: QEvent[] = events ?? []
  if (!list.length) return []
  const [{ data: links }, people] = await Promise.all([
    db.from('q_event_people').select('event_id, person_id').in('event_id', list.map(e => e.id)),
    loadPeople(db),
  ])
  const name = new Map(people.map(p => [p.id, p.name]))
  return list.map(e => ({
    ...e,
    people: (links ?? [])
      .filter(l => l.event_id === e.id)
      .map(l => ({ id: l.person_id, name: name.get(l.person_id) ?? '?' })),
  }))
}

/** Q$ an event pays when it's done (from the "event" log type). */
export async function eventValue(db: DB): Promise<number> {
  const { data } = await db.from('q_log_types').select('value').eq('kind', 'event').order('created_at').limit(1).maybeSingle()
  return data?.value ?? 0
}

export async function loadProjects(db: DB, domain?: Domain) {
  let q = db.from('q_projects').select('*').order('sort_order').order('created_at')
  if (domain) q = q.eq('domain', domain)
  const { data } = await q
  const projects: QProject[] = data ?? []
  if (!projects.length) return []
  const { data: tasks } = await db
    .from('q_tasks')
    .select('project_id, done_at')
    .in('project_id', projects.map(p => p.id))
  return projects.map(p => {
    const mine = (tasks ?? []).filter(x => x.project_id === p.id)
    return { ...p, open: mine.filter(x => !x.done_at).length, done: mine.filter(x => x.done_at).length }
  })
}

export async function loadWork(db: DB) {
  const t = today()
  const [{ data: jobs }, { data: planned }, { data: recent }, { data: week }, { data: locs }] = await Promise.all([
    db.from('q_jobs').select('*').order('created_at'),
    db.from('q_shifts').select('*').eq('status', 'planned').order('worked_on'),
    db.from('q_shifts').select('*').eq('status', 'done').order('worked_on', { ascending: false }).limit(5),
    db.from('q_shifts').select('hours, wage').eq('status', 'done').gte('worked_on', weekStart(t)).lte('worked_on', addDays(weekStart(t), 6)),
    db.from('q_shifts').select('job_id, location').not('location', 'is', null).order('worked_on', { ascending: false }).limit(200),
  ])
  const locations: Record<string, string[]> = {}
  for (const l of locs ?? []) {
    const list = (locations[l.job_id] ??= [])
    if (l.location && !list.includes(l.location)) list.push(l.location)
  }
  const sum = (rows: Pick<QShift, 'hours' | 'wage'>[]) => ({
    hours: Math.round(rows.reduce((s, r) => s + Number(r.hours ?? 0), 0) * 100) / 100,
    pay: rows.reduce((s, r) => s + Number(r.hours ?? 0) * Number(r.wage ?? 0), 0),
  })
  return {
    jobs: jobs ?? [],
    planned: planned ?? [],
    recent: recent ?? [],
    locations,
    week: sum(week ?? []),
  }
}
