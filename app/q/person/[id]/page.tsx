import Link from 'next/link'
import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { loadEventTags, loadGatherings, loadOrgs, loadPeople } from '@/lib/q/loaders'
import { socialGraph } from '@/lib/q/social'
import { relativeDay, today } from '@/lib/q/time'
import FileEditor from '../../_components/FileEditor'
import Gatherings from '../../_components/Gatherings'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const t = today()
  const { data: p } = await db.from('q_people').select('*').eq('id', id).maybeSingle()
  if (!p) notFound()
  const [{ stats }, items, people, orgs, tags] = await Promise.all([
    socialGraph(db),
    loadGatherings(db, { personId: id }),
    loadPeople(db),
    loadOrgs(db),
    loadEventTags(db, 'hang'),
  ])
  const me = stats.find(s => s.id === id)
  const thisMonth = items.filter(x => x.status === 'done' && x.happens_on && x.happens_on.slice(0, 7) === t.slice(0, 7)).length
  const hangs = items.filter(x => x.kind === 'hang')
  const events = items.filter(x => x.kind === 'event')

  return (
    <main className="q-main" data-d="crew">
      <div>
        <div className="q-tiny q-dim">{p.circle}{p.birthday ? ` · birthday ${p.birthday.slice(5)}` : ''}</div>
        <h1 className="q-h1" style={{ color: 'var(--d)' }}>{p.name}</h1>
      </div>

      <section className="q-panel">
        <div className="q-panel-body q-stats">
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.count ?? 0}</div><div className="q-tiny q-faint">times seen</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.last ? relativeDay(me.last, t) : '—'}</div><div className="q-tiny q-faint">last</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{me?.every ? `${me.every}d` : '—'}</div><div className="q-tiny q-faint">usually every</div></div>
        </div>
        <div className="q-panel-body q-small q-dim" style={{ paddingTop: 0, textAlign: 'center' }}>{thisMonth} this month</div>
      </section>

      {me && me.with.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>often with</b></span></div>
          {me.with.slice(0, 8).map(w => (
            <Link key={w.id} href={`/q/person/${w.id}`} className="q-row" style={{ minHeight: 44 }}>
              <span className="q-row-main"><span className="q-row-title">{w.name}</span></span>
              <span className="q-small q-dim">together {w.n}×</span>
              <span className="q-chev">›</span>
            </Link>
          ))}
        </section>
      )}

      <FileEditor kind="person" id={p.id} name={p.name} notes={p.notes} extra={{ circle: p.circle, birthday: p.birthday }} />

      <Gatherings kind="hang" items={hangs} people={people} orgs={orgs} tags={tags} title="hangs together" />
      {events.length > 0 && <Gatherings kind="event" items={events} people={people} orgs={orgs} tags={tags} title="events together" />}
    </main>
  )
}
