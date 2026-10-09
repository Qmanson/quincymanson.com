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

/**
 * Hangs / events with their people (and each person's note) and org.
 * Planned ones always; done ones from `doneSince` on (if given).
 */
export async function loadGatherings(
  db: DB,
  opts: { kind?: 'hang' | 'event'; until?: string; doneSince?: string; personId?: string; orgId?: string } = {},
) {
  let planned = db.from('q_events').select('*').eq('status', 'planned')
  let done = db.from('q_events').select('*').eq('status', 'done').order('happens_on', { ascending: false }).limit(60)
  if (opts.kind) { planned = planned.eq('kind', opts.kind); done = done.eq('kind', opts.kind) }
  if (opts.until) planned = planned.or(`happens_on.lte.${opts.until},happens_on.is.null`)
  if (opts.doneSince) done = done.gte('happens_on', opts.doneSince)
  if (opts.orgId) { planned = planned.eq('org_id', opts.orgId); done = done.eq('org_id', opts.orgId) }

  let personEvents: string[] | null = null
  if (opts.personId) {
    const { data } = await db.from('q_event_people').select('event_id').eq('person_id', opts.personId)
    personEvents = (data ?? []).map(d => d.event_id)
    if (!personEvents.length) return []
    planned = planned.in('id', personEvents)
    done = done.in('id', personEvents)
  }

  const [{ data: p }, { data: d }] = await Promise.all([
    planned,
    opts.doneSince || opts.personId || opts.orgId ? done : Promise.resolve({ data: [] as QEvent[] }),
  ])
  const list: QEvent[] = [...(p ?? []), ...(d ?? [])]
  if (!list.length) return []

  const orgIds = [...new Set(list.map(e => e.org_id).filter((x): x is string => !!x))]
  const [{ data: links }, people, { data: orgs }] = await Promise.all([
    db.from('q_event_people').select('event_id, person_id, note').in('event_id', list.map(e => e.id)),
    loadPeople(db),
    orgIds.length ? db.from('q_orgs').select('id, name').in('id', orgIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const name = new Map(people.map(x => [x.id, x.name]))
  const orgName = new Map((orgs ?? []).map(o => [o.id, o]))
  return list.map(e => ({
    ...e,
    org: e.org_id ? orgName.get(e.org_id) ?? null : null,
    people: (links ?? [])
      .filter(l => l.event_id === e.id)
      .map(l => ({ id: l.person_id, name: name.get(l.person_id) ?? '?', note: l.note })),
  }))
}

export async function loadOrgs(db: DB) {
  const { data } = await db.from('q_orgs').select('id, name').order('name')
  return data ?? []
}

/** Tags used on hangs / events, most used first. */
export async function loadEventTags(db: DB, kind: 'hang' | 'event') {
  const { data } = await db.from('q_events').select('tags').eq('kind', kind).limit(300)
  const counts = new Map<string, number>()
  for (const r of data ?? []) for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 20)
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
