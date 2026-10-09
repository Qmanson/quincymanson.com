import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import { daysBetween, today } from './time'

type DB = SupabaseClient<Database>

export type PersonStats = {
  id: string
  name: string
  circle: string
  count: number
  last: string | null
  /** average days between times you've seen them */
  every: number | null
  /** people they show up with, most often first */
  with: { id: string; name: string; n: number }[]
}

function every(days: string[]): number | null {
  if (days.length < 2) return null
  const sorted = [...days].sort()
  return Math.round(daysBetween(sorted[0], sorted.at(-1)!) / (sorted.length - 1))
}

/**
 * Who you see, how often, and who shows up together — from every hang and
 * event marked done. Two people "connect" each time they're at the same one.
 */
export async function socialGraph(db: DB) {
  const [{ data: people }, { data: events }, { data: links }] = await Promise.all([
    db.from('q_people').select('id, name, circle').order('name'),
    db.from('q_events').select('id, happens_on').eq('status', 'done'),
    db.from('q_event_people').select('event_id, person_id'),
  ])
  const day = new Map((events ?? []).map(e => [e.id, e.happens_on ?? today()]))
  const byEvent = new Map<string, string[]>()
  for (const l of links ?? []) {
    if (!day.has(l.event_id)) continue
    byEvent.set(l.event_id, [...(byEvent.get(l.event_id) ?? []), l.person_id])
  }

  const seen = new Map<string, string[]>()
  const pair = new Map<string, number>()
  for (const [ev, ids] of byEvent) {
    for (const id of ids) seen.set(id, [...(seen.get(id) ?? []), day.get(ev)!])
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = [ids[i], ids[j]].sort().join('|')
        pair.set(k, (pair.get(k) ?? 0) + 1)
      }
  }

  const name = new Map((people ?? []).map(p => [p.id, p.name]))
  const stats: PersonStats[] = (people ?? []).map(p => {
    const days = seen.get(p.id) ?? []
    const withs = [...pair.entries()]
      .filter(([k]) => k.split('|').includes(p.id))
      .map(([k, n]) => {
        const other = k.split('|').find(x => x !== p.id)!
        return { id: other, name: name.get(other) ?? '?', n }
      })
      .sort((a, b) => b.n - a.n)
    return {
      id: p.id,
      name: p.name,
      circle: p.circle,
      count: days.length,
      last: days.length ? [...days].sort().at(-1)! : null,
      every: every(days),
      with: withs,
    }
  })

  const edges = [...pair.entries()].map(([k, n]) => {
    const [a, b] = k.split('|')
    return { a, b, n }
  })
  return { stats, edges }
}

export async function orgStats(db: DB) {
  const [{ data: orgs }, { data: events }] = await Promise.all([
    db.from('q_orgs').select('*').order('name'),
    db.from('q_events').select('org_id, happens_on, status').not('org_id', 'is', null),
  ])
  return (orgs ?? []).map(o => {
    const mine = (events ?? []).filter(e => e.org_id === o.id)
    const days = mine.filter(e => e.status === 'done' && e.happens_on).map(e => e.happens_on!)
    const next = mine.filter(e => e.status === 'planned' && e.happens_on && e.happens_on >= today()).map(e => e.happens_on!).sort()[0] ?? null
    return { ...o, count: days.length, last: days.sort().at(-1) ?? null, every: every(days), next }
  })
}
