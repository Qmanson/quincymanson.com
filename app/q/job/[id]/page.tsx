import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { loadWork } from '@/lib/q/loaders'
import { formatDow, formatShort, monthStart, today } from '@/lib/q/time'
import { money } from '../../_components/Work'
import JobActions from './JobActions'

const monthLabel = (d: string) =>
  new Date(d + 'T00:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toLowerCase()

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const t = today()
  const { data: job } = await db.from('q_jobs').select('*').eq('id', id).maybeSingle()
  if (!job) notFound()
  const [{ data: shifts }, work] = await Promise.all([
    db.from('q_shifts').select('*').eq('job_id', id).order('worked_on', { ascending: false }).limit(500),
    loadWork(db),
  ])
  const done = (shifts ?? []).filter(s => s.status === 'done')
  const planned = (shifts ?? []).filter(s => s.status === 'planned')
  const pay = (s: { hours: number | null; wage: number | null }) => Number(s.hours ?? 0) * Number(s.wage ?? 0)
  const hours = done.reduce((s, x) => s + Number(x.hours ?? 0), 0)
  const thisMonth = done.filter(s => s.worked_on >= monthStart(t))

  const months = new Map<string, typeof done>()
  for (const s of done) {
    const m = monthStart(s.worked_on)
    months.set(m, [...(months.get(m) ?? []), s])
  }

  return (
    <main className="q-main" data-d="admn">
      <div>
        <div className="q-tiny q-dim">job · {money(Number(job.wage))}/h · {job.q_per_hour} Q$/h</div>
        <h1 className="q-h1">{job.name}</h1>
      </div>

      <section className="q-panel">
        <div className="q-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', gap: 8 }}>
          <div><div className="q-value" style={{ fontSize: 24 }}>{thisMonth.reduce((s, x) => s + Number(x.hours ?? 0), 0)}h</div><div className="q-tiny q-faint">this month</div></div>
          <div><div className="q-value" style={{ fontSize: 24 }}>{money(thisMonth.reduce((s, x) => s + pay(x), 0))}</div><div className="q-tiny q-faint">month pay</div></div>
          <div><div className="q-value" style={{ fontSize: 24 }}>{Math.round(hours * 100) / 100}h</div><div className="q-tiny q-faint">all time</div></div>
        </div>
      </section>

      <JobActions job={job} jobs={work.jobs} locations={work.locations} planned={planned} />

      {[...months.entries()].map(([m, list]) => (
        <section key={m} className="q-panel">
          <div className="q-panel-title">
            <span>▸ <b>{monthLabel(m)}</b></span>
            <span>{list.reduce((s, x) => s + Number(x.hours ?? 0), 0)}h · {money(list.reduce((s, x) => s + pay(x), 0))}</span>
          </div>
          {list.map(s => (
            <div key={s.id} className="q-row" style={{ minHeight: 44 }}>
              <span className="q-row-main">
                <span className="q-row-title">{formatDow(s.worked_on)} {formatShort(s.worked_on)} · {s.hours}h</span>
                <span className="q-row-sub">{[s.location, s.note].filter(Boolean).join(' · ') || '—'}</span>
              </span>
              <span className="q-small">{money(pay(s))}</span>
            </div>
          ))}
        </section>
      ))}
      {done.length === 0 && <p className="q-empty q-panel">no shifts logged yet</p>}
    </main>
  )
}
