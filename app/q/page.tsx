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
import type { QRoutine, QTask } from '@/lib/q/types'
import { loadEventTags, loadGatherings, loadOrgs, loadPeople, loadWork } from '@/lib/q/loaders'
import { doLate, toggleRoutineOn } from './actions'
import CheckRow from './_components/CheckRow'
import RoutineRow from './_components/RoutineRow'
import QuickLog from './_components/QuickLog'
import AddFab from './_components/AddFab'
import TaskList from './_components/TaskList'
import Gatherings from './_components/Gatherings'
import { ClaimShifts } from './_components/Work'
import MissionStrip from './missions/MissionStrip'

// Every-few-days routines show up this many days before they're due.
const INTERVAL_HEADS_UP = 3
const BACKFILL_DAYS = 7
const CADENCE_HEAD = { weekly: 'this week', monthly: 'this month', quarterly: 'this quarter', yearly: 'this year' } as const

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
    db.from('q_tasks').select('*').or(`done_at.is.null,done_at.gte.${addDays(t, -1)}`),
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

  const routines = routinesRes.data ?? []
  const byId = new Map(routines.map(r => [r.id, r]))
  const doneKeys = new Set(
    (checksRes.data ?? []).filter(c => c.status !== 'missed').map(c => `${c.routine_id}|${c.period_start}`),
  )
  const isDone = (r: QRoutine) =>
    doneKeys.has(`${r.id}|${r.cadence === 'interval' ? t : periodStart(r.cadence, t)}`)

  const daily = routines.filter(r => r.cadence === 'daily')

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

  // ── a past day: tick what you forgot ──────────────────────
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
            <span>▸ <b>every day</b> · forgot to tick it?</span>
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

  // ── today ─────────────────────────────────────────────────
  const [hangs, events, people, orgs, hangTags, eventTags, work] = await Promise.all([
    loadGatherings(db, { kind: 'hang', until: addDays(t, 14), doneSince: t }),
    loadGatherings(db, { kind: 'event', until: addDays(t, 14), doneSince: t }),
    loadPeople(db),
    loadOrgs(db),
    loadEventTags(db, 'hang'),
    loadEventTags(db, 'event'),
    loadWork(db),
  ])

  // Repeating (weekly and up): due today if its period ends today.
  const repeating = routines
    .filter(r => r.cadence !== 'daily' && r.cadence !== 'interval')
    .map(r => {
      const c = r.cadence as keyof typeof CADENCE_HEAD
      return { r, head: CADENCE_HEAD[c], end: periodEnd(c, periodStart(c, t)) }
    })

  // Every-few-days: show when close to (or past) due.
  const lastDone = new Map<string, string>()
  for (const c of intervalRes.data ?? []) if (!lastDone.has(c.routine_id)) lastDone.set(c.routine_id, c.period_start)
  const intervals = routines
    .filter(r => r.cadence === 'interval' && r.interval_days)
    .map(r => {
      const due = addDays(lastDone.get(r.id) ?? r.starts_on, r.interval_days!)
      return { r, head: 'coming due', end: due }
    })
    .filter(x => isDone(x.r) || daysBetween(t, x.end) <= INTERVAL_HEADS_UP)

  const dueToday = [...repeating, ...intervals].filter(x => x.end <= t)
  const later = [...repeating, ...intervals].filter(x => x.end > t)

  const happening = [...hangs, ...events].filter(x => x.happens_on && x.happens_on <= t)
  const soon = { hangs: hangs.filter(x => x.status === 'planned' && x.happens_on && x.happens_on > t), events: events.filter(x => x.status === 'planned' && x.happens_on && x.happens_on > t) }

  const total = daily.length + dueToday.length
  const doneCount = daily.filter(isDone).length + dueToday.filter(x => isDone(x.r)).length
  const taskFocus = (x: QTask) => (x.due_date ? x.due_date <= t : x.urgency === 'asap')

  // weekly+ misses (dailies are fixed from the day strip)
  const missed = (missedRes.data ?? []).flatMap(c => {
    const r = byId.get(c.routine_id)
    return r && r.cadence !== 'daily' ? [{ c, r }] : []
  })

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">{formatDow(t)} · {formatShort(t)}</div>
        <h1 className="q-h1">today</h1>
      </div>

      {dayStrip}

      {isSunday(t) && (
        <Link href="/q/review/weekly" className="q-panel q-panel-body" style={{ display: 'flex', justifyContent: 'space-between', borderColor: 'var(--phosphor)' }}>
          <span className="q-pos">$ payday: weekly review is open</span>
          <span className="q-pos">→</span>
        </Link>
      )}

      <section className="q-panel">
        <div className="q-panel-title">
          <span>▸ <b>routines today</b></span>
          <span className={doneCount === total && total ? 'q-pos' : ''}>{doneCount}/{total}</span>
        </div>
        {total === 0 && <p className="q-empty">nothing yet. tap + to add a routine</p>}
        {daily.length > 0 && <div className="q-sub-head">every day</div>}
        {daily.map(r => <RoutineRow key={r.id} r={r} done={isDone(r)} />)}
        {dueToday.length > 0 && <div className="q-sub-head">last day to do these</div>}
        {dueToday.map(({ r, head }) => (
          <RoutineRow key={r.id} r={r} done={isDone(r)} sub={<span>{head}</span>} />
        ))}
      </section>

      {happening.length > 0 && (
        <>
          {happening.some(x => x.kind === 'hang') && (
            <Gatherings kind="hang" items={happening.filter(x => x.kind === 'hang')} people={people} orgs={orgs} tags={hangTags} title="hangs today" />
          )}
          {happening.some(x => x.kind === 'event') && (
            <Gatherings kind="event" items={happening.filter(x => x.kind === 'event')} people={people} orgs={orgs} tags={eventTags} title="events today" />
          )}
        </>
      )}

      <TaskList tasks={tasksRes.data ?? []} today={t} showDomain focus={taskFocus} title="tasks due today" />

      <ClaimShifts shifts={work.planned.filter(s => s.worked_on <= t)} jobs={work.jobs} locations={work.locations} />

      {logTypesRes.data && logTypesRes.data.length > 0 && <QuickLog logTypes={logTypesRes.data} />}

      <MissionStrip missions={missionsRes.data ?? []} />

      {later.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>repeating</b></span><span>do any time before it resets</span></div>
          {(['this week', 'this month', 'this quarter', 'this year', 'coming due'] as const).map(head => {
            const rows = later.filter(x => x.head === head).sort((a, b) => Number(isDone(a.r)) - Number(isDone(b.r)))
            if (!rows.length) return null
            return (
              <div key={head}>
                <div className="q-sub-head">{head}</div>
                {rows.map(({ r, end }) => (
                  <RoutineRow
                    key={r.id}
                    r={r}
                    done={isDone(r)}
                    sub={<span>{isDone(r) ? 'done ✓' : head === 'coming due' ? `due ${relativeDay(end, t)}` : `resets ${relativeDay(addDays(end, 1), t)}`}</span>}
                  />
                ))}
              </div>
            )
          })}
        </section>
      )}

      {soon.hangs.length > 0 && <Gatherings kind="hang" items={soon.hangs} people={people} orgs={orgs} tags={hangTags} title="hangs coming up" showRecent={false} />}
      {soon.events.length > 0 && <Gatherings kind="event" items={soon.events} people={people} orgs={orgs} tags={eventTags} title="events coming up" showRecent={false} />}

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

      <p className="q-faint q-small" style={{ textAlign: 'center', display: 'flex', gap: 16, justifyContent: 'center' }}>
        <Link href="/q/history">history →</Link>
        <Link href="/q/domains">all domains →</Link>
      </p>

      <AddFab />
    </main>
  )
}
