import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import { relativeDay } from '@/lib/q/time'

/** Everyone you've logged at events — how often and when you last saw them. */
export default async function PeoplePanel({ db }: { db: SupabaseClient<Database> }) {
  const [{ data: people }, { data: links }] = await Promise.all([
    db.from('q_people').select('id, name').order('name'),
    db.from('q_log_people').select('person_id, log_id'),
  ])
  const logIds = [...new Set((links ?? []).map(l => l.log_id))]
  const { data: logs } = logIds.length
    ? await db.from('q_logs').select('id, logged_on').in('id', logIds)
    : { data: [] as { id: string; logged_on: string }[] }
  const dayOf = new Map((logs ?? []).map(l => [l.id, l.logged_on]))

  const rows = (people ?? [])
    .map(p => {
      const days = (links ?? []).filter(l => l.person_id === p.id).map(l => dayOf.get(l.log_id)).filter((d): d is string => !!d)
      return { ...p, count: days.length, last: days.sort().at(-1) ?? null }
    })
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || a.name.localeCompare(b.name))

  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>people</b></span><span>{rows.length}</span></div>
      {rows.length === 0 && <p className="q-empty">people you tag at events show up here</p>}
      {rows.map(p => (
        <div key={p.id} className="q-row" style={{ minHeight: 44 }}>
          <span className="q-row-main">
            <span className="q-row-title" style={{ display: 'block' }}>{p.name}</span>
            <span className="q-row-sub">{p.last ? `last seen ${relativeDay(p.last)}` : 'not seen yet'}</span>
          </span>
          <span className="q-value">{p.count}</span>
        </div>
      ))}
    </section>
  )
}
