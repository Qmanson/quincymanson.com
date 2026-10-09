import Link from 'next/link'
import { relativeDay } from '@/lib/q/time'
import NewThing from './NewThing'

type OrgRow = { id: string; name: string; count: number; last: string | null; every: number | null; next: string | null }

export default function Orgs({ orgs }: { orgs: OrgRow[] }) {
  const sorted = [...orgs].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return (
    <section className="q-panel" data-d="city">
      <div className="q-panel-title">
        <span>▸ <b>organizations</b></span>
        <NewThing kind="org" />
      </div>
      {sorted.length === 0 && <p className="q-empty">add the groups you follow</p>}
      {sorted.map(o => (
        <Link key={o.id} href={`/q/org/${o.id}`} className="q-row">
          <span className="q-row-main">
            <span className="q-row-title">{o.name}</span>
            <span className="q-row-sub q-row-meta">
              <span>{o.last ? `last went ${relativeDay(o.last)}` : 'not been yet'}</span>
              {o.every && <span>~every {o.every}d</span>}
              {o.next && <span className="q-pos">next {relativeDay(o.next)}</span>}
            </span>
          </span>
          <span className="q-value">{o.count}</span>
          <span className="q-chev">›</span>
        </Link>
      ))}
    </section>
  )
}
