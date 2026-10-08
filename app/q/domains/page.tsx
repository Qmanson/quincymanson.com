import Link from 'next/link'
import { qPage } from '@/lib/q/db'
import { DOMAIN_INFO } from '@/lib/q/domains'
import { DOMAINS } from '@/lib/q/types'

export default async function Domains() {
  const db = await qPage()
  const [{ data: routines }, { data: tasks }] = await Promise.all([
    db.from('q_routines').select('domain').eq('active', true),
    db.from('q_tasks').select('domain').is('done_at', null),
  ])
  const count = (rows: { domain: string }[] | null, d: string) => (rows ?? []).filter(r => r.domain === d).length

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">8 domains</div>
        <h1 className="q-h1">life</h1>
      </div>
      <div className="q-grid-2">
        {DOMAINS.map(d => (
          <Link key={d} href={`/q/d/${d}`} className="q-tile" data-d={d}>
            <span className="q-tiny q-faint">0{DOMAIN_INFO[d].n}</span>
            <span className="q-tile-name">{d}</span>
            <span className="q-small q-dim">{DOMAIN_INFO[d].blurb}</span>
            <span className="q-tiny q-faint" style={{ marginTop: 'auto' }}>
              {count(routines, d)} routines · {count(tasks, d)} tasks
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
