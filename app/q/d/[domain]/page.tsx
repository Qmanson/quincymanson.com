import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { DOMAIN_INFO } from '@/lib/q/domains'
import { loadMissionViews } from '@/lib/q/missions'
import { viewLogs } from '@/lib/q/logview'
import { loadEventTags, loadGatherings, loadOrgs, loadPeople, loadProjects, loadWork } from '@/lib/q/loaders'
import { orgStats, socialGraph } from '@/lib/q/social'
import { workoutStats } from '@/lib/q/workouts'
import { addDays, monthStart, periodStart, quarterStart, today, weekStart, yearStart } from '@/lib/q/time'
import { DOMAINS, type Domain } from '@/lib/q/types'
import AddFab from '../../_components/AddFab'
import Gatherings from '../../_components/Gatherings'
import Orgs from '../../_components/Orgs'
import People from '../../_components/People'
import Projects from '../../_components/Projects'
import TaskList from '../../_components/TaskList'
import Work from '../../_components/Work'
import Workouts from '../../_components/Workouts'
import MissionCard from '../../missions/MissionCard'
import DomainLists from './DomainLists'
import DomainSwipe from './DomainSwipe'

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  if (!(DOMAINS as readonly string[]).includes(domain)) notFound()
  const d = domain as Domain
  const db = await qPage()
  const t = today()
  const kind = d === 'crew' ? 'hang' : d === 'city' ? 'event' : null

  const [{ data: routines }, { data: checks }, { data: tasks }, { data: logTypes }, { data: missions }, projects, work] =
    await Promise.all([
      db.from('q_routines').select('*').eq('domain', d).order('sort_order').order('created_at'),
      db
        .from('q_routine_checks')
        .select('routine_id, period_start, status')
        .in('period_start', [t, weekStart(t), monthStart(t), quarterStart(t), yearStart(t)])
        .neq('status', 'missed'),
      db.from('q_tasks').select('*').eq('domain', d).or(`done_at.is.null,done_at.gte.${addDays(t, -3)}`),
      db.from('q_log_types').select('*').eq('domain', d).order('sort_order').order('created_at'),
      db.from('q_missions').select('*').eq('domain', d).eq('status', 'active'),
      loadProjects(db, d),
      d === 'admn' ? loadWork(db) : Promise.resolve(null),
    ])

  const [gatherings, people, orgs, tags, social, orgRows, workouts] = await Promise.all([
    kind ? loadGatherings(db, { kind, doneSince: addDays(t, -60) }) : Promise.resolve([]),
    kind ? loadPeople(db) : Promise.resolve([]),
    kind ? loadOrgs(db) : Promise.resolve([]),
    kind ? loadEventTags(db, kind) : Promise.resolve([]),
    d === 'crew' ? socialGraph(db) : Promise.resolve(null),
    d === 'city' ? orgStats(db) : Promise.resolve(null),
    d === 'body' ? workoutStats(db) : Promise.resolve(null),
  ])

  // a routine is done if it has a check for the period containing today
  const doneIds = (routines ?? [])
    .filter(r => {
      const p = r.cadence === 'interval' ? t : periodStart(r.cadence, t)
      return (checks ?? []).some(c => c.routine_id === r.id && c.period_start === p)
    })
    .map(r => r.id)

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
      {kind && <Gatherings kind={kind} items={gatherings} people={people} orgs={orgs} tags={tags} />}
      {social && <People stats={social.stats} edges={social.edges} />}
      {orgRows && <Orgs orgs={orgRows} />}

      <Projects projects={projects} domain={d} today={t} />
      <TaskList tasks={tasks ?? []} today={t} projects={projectRefs} />
      <DomainLists routines={routines ?? []} doneIds={doneIds} logTypes={logTypes ?? []} logs={logViews} />
      {workouts && <Workouts workouts={workouts} />}
      <AddFab domain={d} projects={projectRefs} />
    </main>
  )
}
