import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { loadEventTags, loadGatherings, loadOrgs, loadPeople } from '@/lib/q/loaders'
import { orgStats } from '@/lib/q/social'
import { relativeDay, today } from '@/lib/q/time'
import FileEditor from '../../_components/FileEditor'
import Gatherings from '../../_components/Gatherings'

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const t = today()
  const { data: o } = await db.from('q_orgs').select('*').eq('id', id).maybeSingle()
  if (!o) notFound()
  const [all, items, people, orgs, tags] = await Promise.all([
    orgStats(db),
    loadGatherings(db, { orgId: id }),
    loadPeople(db),
    loadOrgs(db),
    loadEventTags(db, 'event'),
  ])
  const me = all.find(x => x.id === id)

  return (
    <main className="q-main" data-d="city">
      <div>
        <div className="q-tiny q-dim">
          organization{o.url && <> · <a href={o.url} target="_blank" rel="noreferrer" className="q-pos">site ↗</a></>}
        </div>
        <h1 className="q-h1" style={{ color: 'var(--d)' }}>{o.name}</h1>
      </div>

      <section className="q-panel">
        <div className="q-panel-body q-stats">
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.count ?? 0}</div><div className="q-tiny q-faint">events been to</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.last ? relativeDay(me.last, t) : '—'}</div><div className="q-tiny q-faint">last</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.every ? `${me.every}d` : '—'}</div><div className="q-tiny q-faint">usually every</div></div>
        </div>
      </section>

      <FileEditor kind="org" id={o.id} name={o.name} notes={o.notes} extra={{ url: o.url }} />
      <Gatherings kind="event" items={items} people={people} orgs={orgs} tags={tags} />
    </main>
  )
}
