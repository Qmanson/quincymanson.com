import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { DOMAIN_INFO } from '@/lib/q/domains'
import { loadMissionViews } from '@/lib/q/missions'
import { viewLogs } from '@/lib/q/logview'
import { eventValue, loadEvents, loadPeople, loadProjects, loadWork } from '@/lib/q/loaders'
import { addDays, today } from '@/lib/q/time'
import { DOMAINS, type Domain } from '@/lib/q/types'
import AddFab from '../../_components/AddFab'
import Events from '../../_components/Events'
import Projects from '../../_components/Projects'
import TaskList from '../../_components/TaskList'
import Work from '../../_components/Work'
import MissionCard from '../../missions/MissionCard'
import DomainLists from './DomainLists'
import PeoplePanel from './PeoplePanel'
import DomainSwipe from './DomainSwipe'

// Domains where the event queue shows by default (others show it once they have one).
const EVENT_DOMAINS: Domain[] = ['crew', 'city', 'arts']

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  if (!(DOMAINS as readonly string[]).includes(domain)) notFound()
  const d = domain as Domain
  const db = await qPage()
  const t = today()

  const [{ data: routines }, { data: tasks }, { data: logTypes }, { data: missions }, projects, events, people, evValue, work] =
    await Promise.all([
      db.from('q_routines').select('*').eq('domain', d).order('sort_order').order('created_at'),
      db.from('q_tasks').select('*').eq('domain', d).or(`done_at.is.null,done_at.gte.${addDays(t, -3)}`),
      db.from('q_log_types').select('*').eq('domain', d).order('sort_order').order('created_at'),
      db.from('q_missions').select('*').eq('domain', d).eq('status', 'active'),
      loadProjects(db, d),
      loadEvents(db, { domain: d }),
      loadPeople(db),
      eventValue(db),
      d === 'admn' ? loadWork(db) : Promise.resolve(null),
    ])

  const typeIds = (logTypes ?? []).map(lt => lt.id)
  const { data: logs } = typeIds.length
    ? await db.from('q_logs').select('*').in('log_type_id', typeIds).order('logged_on', { ascending: false }).order('created_at', { ascending: false }).limit(25)
    : { data: [] }
  const [views, logViews] = await Promise.all([
    loadMissionViews(db, missions ?? []),
    viewLogs(db, logs ?? [], logTypes ?? []),
  ])
  const projectRefs = projects.map(p => ({ id: p.id, title: p.title, domain: p.domain }))

  return (
    <main className="q-main" data-d={d}>
      <DomainSwipe current={d} />
      <div>
        <div className="q-tiny q-dim">0{DOMAIN_INFO[d].n} · {DOMAIN_INFO[d].blurb}</div>
        <h1 className="q-h1" style={{ color: 'var(--d)', textShadow: '0 0 14px var(--d)' }}>{d}</h1>
      </div>

      {(missions ?? []).map(m => <MissionCard key={m.id} m={m} v={views.get(m.id)} compact />)}

      {work && <Work {...work} />}
      {(EVENT_DOMAINS.includes(d) || events.length > 0) && (
        <Events events={events} people={people} domain={d} value={evValue} today={t} />
      )}
      <TaskList tasks={tasks ?? []} today={t} projects={projectRefs} />
      <Projects projects={projects} domain={d} today={t} />
      <DomainLists routines={routines ?? []} logTypes={logTypes ?? []} logs={logViews} />
      {d === 'crew' && <PeoplePanel db={db} />}
      <AddFab domain={d} projects={projectRefs} />
    </main>
  )
}
