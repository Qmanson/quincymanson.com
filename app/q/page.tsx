import Link from 'next/link'
import { qPage } from '@/lib/q/db'
import {
  addDays,
  daysBetween,
  formatDow,
  formatShort,
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
import type { QRoutine } from '@/lib/q/types'
import { doLate, toggleRoutine, toggleTask } from './actions'
import CheckRow from './_components/CheckRow'
import QuickLog from './_components/QuickLog'
import AddFab from './_components/AddFab'
import MissionStrip from './missions/MissionStrip'

// Interval routines show up this many days before they're due.
const INTERVAL_HEADS_UP = 3
const CADENCE_LABEL = { weekly: 'this week', monthly: 'this month', quarterly: 'this quarter', yearly: 'this year' } as const

export default async function Today() {
  const db = await qPage()
  const t = today()

  const [routinesRes, checksRes, missedRes, tasksRes, logTypesRes, intervalRes, missionsRes] = await Promise.all([
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
      .or(`done_at.is.null,done_at.gte.${addDays(t, -1)}`)
      .order('due_date', { ascending: true, nullsFirst: false }),
    db.from('q_log_types').select('*').eq('active', true).order('sort_order').order('created_at'),
    db
      .from('q_routine_checks')
      .select('routine_id, period_start')
      .in('status', ['done', 'late'])
      .order('period_start', { ascending: false })
      .limit(500),
    db.from('q_missions').select('*').eq('status', 'active').order('created_at'),
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

  const missed = (missedRes.data ?? []).flatMap(c => {
    const r = byId.get(c.routine_id)
    return r ? [{ c, r }] : []
  })

  const horizon = addDays(t, 7)
  const tasks = (tasksRes.data ?? []).filter(
    task => task.done_at || (task.due_date && task.due_date <= horizon),
  )

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">{formatDow(t)} · {formatShort(t)}</div>
        <h1 className="q-h1">today</h1>
      </div>

      <MissionStrip missions={missionsRes.data ?? []} />

      <section className="q-panel">
        <div className="q-panel-title">
          <span>▸ <b>daily</b></span>
          <span className={dailyDone === daily.length && daily.length ? 'q-pos' : ''}>
            {dailyDone}/{daily.length}
          </span>
        </div>
        {daily.length ? (
          daily.map(r => (
            <CheckRow
              key={r.id}
              title={r.title}
              sub={<span className="q-tag" data-d={r.domain}>{r.domain}</span>}
              value={r.value}
              domain={r.domain}
              done={isDone(r)}
              onToggle={toggleRoutine.bind(null, r.id)}
            />
          ))
        ) : (
          <p className="q-empty">no daily routines yet — tap + to add one</p>
        )}
      </section>

      {logTypesRes.data && logTypesRes.data.length > 0 && <QuickLog logTypes={logTypesRes.data} />}

      {upcoming.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>on the clock</b></span></div>
          {upcoming.map(({ r, sub }) => (
            <CheckRow
              key={r.id}
              title={r.title}
              sub={<><span className="q-tag" data-d={r.domain}>{r.domain}</span><span>{sub}</span></>}
              value={r.value}
              domain={r.domain}
              done={isDone(r)}
              onToggle={toggleRoutine.bind(null, r.id)}
            />
          ))}
        </section>
      )}

      {tasks.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>tasks</b> due this week</span></div>
          {tasks.map(task => (
            <CheckRow
              key={task.id}
              title={task.title}
              sub={
                <>
                  <span className="q-tag" data-d={task.domain}>{task.domain}</span>
                  {task.due_date && (
                    <span className={task.due_date < t && !task.done_at ? 'q-neg' : ''}>
                      {relativeDay(task.due_date, t)}
                    </span>
                  )}
                </>
              }
              value={task.value}
              domain={task.domain}
              done={!!task.done_at}
              onToggle={toggleTask.bind(null, task.id)}
            />
          ))}
        </section>
      )}

      {missed.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title">
            <span>▸ <b className="q-neg">missed</b> · do it late for half</span>
          </div>
          {missed.map(({ c, r }) => (
            <CheckRow
              key={c.id}
              title={r.title}
              sub={<><span className="q-tag" data-d={r.domain}>{r.domain}</span><span>{relativeDay(c.period_start, t)}</span></>}
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
