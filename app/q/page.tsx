import Link from 'next/link'
import { qPage } from '@/lib/q/db'
import {
  addDays,
  daysBetween,
  formatDow,
  formatShort,
  isSunday,
  monthStart,
  periodEnd,
  periodStart,
  quarterStart,
  relativeDay,
  today,
  weekStart,
  yearStart,
} from '@/lib/q/time'
import { lateValue } from '@/lib/q/points'
import type { Domain, QRoutine, QTask } from '@/lib/q/types'
import { urgencyOf } from '@/lib/q/tasks'
import { eventValue, loadEvents, loadPeople, loadWork } from '@/lib/q/loaders'
import { doLate, toggleRoutine, toggleRoutineOn } from './actions'
import CheckRow from './_components/CheckRow'
import QuickLog from './_components/QuickLog'
import AddFab from './_components/AddFab'
import MissionStrip from './missions/MissionStrip'
import TaskList from './_components/TaskList'
import Events from './_components/Events'
import { ClaimShifts } from './_components/Work'
import { completeEvent } from './plan/actions'

// Interval routines show up this many days before they're due.
const INTERVAL_HEADS_UP = 3
const CADENCE_LABEL = { weekly: 'this week', monthly: 'this month', quarterly: 'this quarter', yearly: 'this year' } as const

const BACKFILL_DAYS = 7

export default async function Today({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const db = await qPage()
  const t = today()
  const { day } = await searchParams
  const first = addDays(t, -BACKFILL_DAYS)
  const sel = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= first && day < t ? day : t

  const [routinesRes, checksRes, missedRes, tasksRes, logTypesRes, intervalRes, missionsRes, weekRes] = await Promise.all([
    db.from('q_routines').select('*').eq('active', true).order('sort_order').order('created_at'),
    db
      .from('q_routine_checks')
      .select('routine_id, period_start, status')
      .in('period_start', [t, weekStart(t), monthStart(t), quarterStart(t), yearStart(t)]),
    db
      .from('q_routine_checks')
      .select('id, routine_id, period_start')
      .eq('status', 'missed')
      .gte('period_start', addDays(t, -7))
      .order('period_start', { ascending: false }),
    db
      .from('q_tasks')
      .select('*')
      .or(`done_at.is.null,done_at.gte.${addDays(t, -1)}`),
    db.from('q_log_types').select('*').eq('active', true).order('sort_order').order('created_at'),
    db
      .from('q_routine_checks')
      .select('routine_id, period_start')
      .in('status', ['done', 'late'])
      .order('period_start', { ascending: false })
      .limit(500),
    db.from('q_missions').select('*').eq('status', 'active').order('created_at'),
    db.from('q_routine_checks').select('routine_id, period_start, status').gte('period_start', first).lte('period_start', t),
  ])
  const [events, people, evValue, work] = await Promise.all([
    loadEvents(db, { until: addDays(t, 14) }),
    loadPeople(db),
    eventValue(db),
    loadWork(db),
  ])

  const routines = routinesRes.data ?? []
  const byId = new Map(routines.map(r => [r.id, r]))
  const doneKeys = new Set(
    (checksRes.data ?? []).filter(c => c.status !== 'missed').map(c => `${c.routine_id}|${c.period_start}`),
  )
  const isDone = (r: QRoutine) =>
    doneKeys.has(`${r.id}|${r.cadence === 'interval' ? t : periodStart(r.cadence, t)}`)

  const daily = routines.filter(r => r.cadence === 'daily')
  const dailyDone = daily.filter(isDone).length

  // The last week of dailies, for the day strip and past-day view.
  const dayStatus = new Map<string, string>()
  for (const c of weekRes.data ?? []) dayStatus.set(`${c.routine_id}|${c.period_start}`, c.status)
  const strip = Array.from({ length: BACKFILL_DAYS + 1 }, (_, i) => {
    const d = addDays(first, i)
    const due = daily.filter(r => r.starts_on <= d)
    const n = due.filter(r => ['done', 'late'].includes(dayStatus.get(`${r.id}|${d}`) ?? '')).length
    return { d, n, total: due.length }
  })
  const dayStrip = (
    <nav className="q-day-strip">
      {strip.map(({ d, n, total }) => (
        <Link
          key={d}
          href={d === t ? '/q' : `/q?day=${d}`}
          replace
          className={`q-day ${d === sel ? 'is-on' : ''}`}
          style={{ ['--fill' as string]: total ? n / total : 0 }}
        >
          <span className="q-tiny">{d === t ? 'today' : formatDow(d).slice(0, 2)}</span>
          <span className="q-day-num">{Number(d.slice(8))}</span>
          <i />
        </Link>
      ))}
    </nav>
  )

  if (sel !== t) {
    const due = daily.filter(r => r.starts_on <= sel)
    return (
      <main className="q-main">
        <div>
          <div className="q-tiny q-dim">{formatDow(sel)} · {formatShort(sel)}</div>
          <h1 className="q-h1">{relativeDay(sel, t)}</h1>
        </div>
        {dayStrip}
        <section className="q-panel">
          <div className="q-panel-title">
            <span>▸ <b>daily</b> · forgot to tick it?</span>
            <span>{strip.find(x => x.d === sel)?.n ?? 0}/{due.length}</span>
          </div>
          {due.length ? due.map(r => {
            const st = dayStatus.get(`${r.id}|${sel}`)
            return (
              <CheckRow
                key={`${r.id}-${sel}`}
                title={r.title}
                sub={<span className="q-tag" data-d={r.domain}>{r.domain}</span>}
                value={r.value}
                domain={r.domain}
                done={st === 'done' || st === 'late'}
                missed={st === 'missed'}
                onToggle={toggleRoutineOn.bind(null, r.id, sel)}
              />
            )
          }) : <p className="q-empty">no dailies yet on this day</p>}
        </section>
        <p className="q-small q-faint" style={{ textAlign: 'center' }}>ticking a past day pays full value and cancels its miss</p>
      </main>
    )
  }

  // Non-daily routines for their current period.
  const cycle = routines
    .filter(r => r.cadence !== 'daily' && r.cadence !== 'interval')
    .map(r => {
      const c = r.cadence as Exclude<QRoutine['cadence'], 'daily' | 'interval'>
      const end = periodEnd(c, periodStart(c, t))
      return { r, end, sub: `${CADENCE_LABEL[c]} · ends ${relativeDay(end, t)}` }
    })

  // Interval routines that are close to or past due.
  const lastDone = new Map<string, string>()
  for (const c of intervalRes.data ?? []) if (!lastDone.has(c.routine_id)) lastDone.set(c.routine_id, c.period_start)
  const intervals = routines
    .filter(r => r.cadence === 'interval' && r.interval_days)
    .map(r => {
      const last = lastDone.get(r.id) ?? r.starts_on
      const due = addDays(last, r.interval_days!)
      return { r, end: due, sub: `every ${r.interval_days}d · due ${relativeDay(due, t)}` }
    })
    .filter(x => isDone(x.r) || daysBetween(t, x.end) <= INTERVAL_HEADS_UP)

  const upcoming = [...cycle, ...intervals].sort(
    (a, b) => Number(isDone(a.r)) - Number(isDone(b.r)) || a.end.localeCompare(b.end),
  )

  // dailies are fixed from the day strip; this is for weekly+ routines
  const missed = (missedRes.data ?? []).flatMap(c => {
    const r = byId.get(c.routine_id)
    return r && r.cadence !== 'daily' ? [{ c, r }] : []
  })

  // Today's list: dailies + anything on the clock that's due today + events
  // happening today. Tasks due today (or overdue, or undated asap) follow.
  const dueToday = (x: { r: QRoutine; end: string }) => x.end <= t
  const clockToday = upcoming.filter(dueToday)
  const clockLater = upcoming.filter(x => !dueToday(x))

  const openTasks = (tasksRes.data ?? []).filter(x => !x.done_at)
  const recentlyDone = (tasksRes.data ?? []).filter(x => x.done_at)
  const taskToday = (x: QTask) => (x.due_date ? x.due_date <= t : x.urgency === 'asap')
  const tasksToday = [...openTasks.filter(taskToday), ...recentlyDone.filter(taskToday)]
  const tasksSoon = openTasks.filter(x => !taskToday(x) && urgencyOf(x, t) !== 'whenever')

  const eventsToday = events.filter(e => e.happens_on && e.happens_on <= t)
  const eventsSoon = events.filter(e => e.happens_on && e.happens_on > t)

  const total = daily.length + clockToday.length + eventsToday.length
  const doneCount = dailyDone + clockToday.filter(x => isDone(x.r)).length
  const tag = (d: Domain) => <span className="q-tag" data-d={d}>{d}</span>

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">{formatDow(t)} · {formatShort(t)}</div>
        <h1 className="q-h1">today</h1>
      </div>

      {dayStrip}

      {isSunday(t) && (
        <Link href="/q/review/weekly" className="q-panel q-panel-body" style={{ display: 'flex', justifyContent: 'space-between', borderColor: 'var(--phosphor)' }}>
          <span className="q-pos">$ payday — weekly review is open</span>
          <span className="q-pos">→</span>
        </Link>
      )}

      <MissionStrip missions={missionsRes.data ?? []} />

      <section className="q-panel">
        <div className="q-panel-title">
          <span>▸ <b>today</b></span>
          <span className={doneCount === total && total ? 'q-pos' : ''}>{doneCount}/{total}</span>
        </div>
        {total === 0 && <p className="q-empty">nothing yet — tap + to add a routine</p>}
        {daily.map(r => (
          <CheckRow key={r.id} title={r.title} sub={tag(r.domain)} value={r.value} domain={r.domain} done={isDone(r)} onToggle={toggleRoutine.bind(null, r.id)} />
        ))}
        {clockToday.map(({ r, sub }) => (
          <CheckRow
            key={r.id}
            title={r.title}
            sub={<>{tag(r.domain)}<span>{sub}</span></>}
            value={r.value}
            domain={r.domain}
            done={isDone(r)}
            onToggle={toggleRoutine.bind(null, r.id)}
          />
        ))}
        {eventsToday.map(ev => (
          <CheckRow
            key={ev.id}
            title={ev.title}
            sub={<>{tag(ev.domain)}<span>event{ev.people.length ? ` · with ${ev.people.map(p => p.name).join(', ')}` : ''}</span></>}
            value={evValue}
            domain={ev.domain}
            done={false}
            oneWay
            onToggle={completeEvent.bind(null, ev.id)}
          />
        ))}
      </section>

      {tasksToday.length > 0 && <TaskList tasks={tasksToday} today={t} showDomain grouped={false} title="tasks for today" />}

      <ClaimShifts shifts={work.planned.filter(s => s.worked_on <= t)} jobs={work.jobs} locations={work.locations} />

      {logTypesRes.data && logTypesRes.data.length > 0 && <QuickLog logTypes={logTypesRes.data} />}

      {eventsSoon.length > 0 && <Events events={eventsSoon} people={people} value={evValue} today={t} />}

      {clockLater.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>on the clock</b></span></div>
          {clockLater.map(({ r, sub }) => (
            <CheckRow
              key={r.id}
              title={r.title}
              sub={<>{tag(r.domain)}<span>{sub}</span></>}
              value={r.value}
              domain={r.domain}
              done={isDone(r)}
              onToggle={toggleRoutine.bind(null, r.id)}
            />
          ))}
        </section>
      )}

      {tasksSoon.length > 0 && <TaskList tasks={tasksSoon} today={t} showDomain title="coming up" />}

      {missed.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title">
            <span>▸ <b className="q-neg">missed</b> · do it late for half</span>
          </div>
          {missed.map(({ c, r }) => (
            <CheckRow
              key={c.id}
              title={r.title}
              sub={<>{tag(r.domain)}<span>{relativeDay(c.period_start, t)}</span></>}
              value={lateValue(r)}
              domain={r.domain}
              done={false}
              missed
              oneWay
              onToggle={doLate.bind(null, c.id)}
            />
          ))}
        </section>
      )}

      <p className="q-faint q-small" style={{ textAlign: 'center' }}>
        <Link href="/q/domains">all routines & tasks →</Link>
      </p>

      <AddFab />
    </main>
  )
}
