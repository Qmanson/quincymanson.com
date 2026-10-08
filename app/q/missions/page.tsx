import { qPage } from '@/lib/q/db'
import { loadMissionViews } from '@/lib/q/missions'
import { addMonths, monthStart, quarterStart, today } from '@/lib/q/time'
import MissionCard from './MissionCard'
import NewMission from './NewMission'

const monthName = (d: string) =>
  new Date(d + 'T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase()
const quarterName = (d: string) => `q${Math.floor(Number(d.slice(5, 7)) / 3) + 1}`

export default async function Missions() {
  const db = await qPage()
  const t = today()

  const [{ data: missions }, { data: logTypes }, { data: history }] = await Promise.all([
    db.from('q_missions').select('*').in('status', ['active', 'planned']).order('period_start').order('created_at'),
    db.from('q_log_types').select('*').eq('active', true).order('name'),
    db
      .from('q_missions')
      .select('*')
      .in('status', ['passed', 'failed', 'abandoned'])
      .order('completed_at', { ascending: false })
      .limit(20),
  ])

  const all = missions ?? []
  const active = all.filter(m => m.status === 'active')
  const planned = all.filter(m => m.status === 'planned')
  const views = await loadMissionViews(db, active)

  const m0 = monthStart(t)
  const q0 = quarterStart(t)
  const periods = {
    month: [monthName(m0), monthName(addMonths(m0, 1))] as [string, string],
    quarter: [quarterName(q0), quarterName(addMonths(q0, 3))] as [string, string],
  }

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">set each month & quarter</div>
        <h1 className="q-h1">missions</h1>
      </div>

      <NewMission logTypes={logTypes ?? []} periods={periods} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="q-tiny q-dim">▸ active</div>
        {active.length ? active.map(m => <MissionCard key={m.id} m={m} v={views.get(m.id)} />) : (
          <p className="q-empty q-panel">nothing running. start a planned one ↓</p>
        )}
      </section>

      {planned.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="q-tiny q-dim">▸ planned</div>
          {planned.map(m => (
            <div key={m.id}>
              <div className="q-tiny q-faint" style={{ marginBottom: 4 }}>
                {m.period === 'month' ? monthName(m.period_start) : quarterName(m.period_start)} {m.period_start.slice(0, 4)}
              </div>
              <MissionCard m={m} />
            </div>
          ))}
        </section>
      )}

      {history && history.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>log</b></span></div>
          {history.map(m => (
            <div key={m.id} className="q-row" data-d={m.domain}>
              <span className="q-dot" />
              <span className="q-row-main">
                <span className="q-row-title" style={{ display: 'block' }}>{m.title}</span>
                <span className="q-row-sub">{m.status}</span>
              </span>
              <span className={`q-value ${m.status === 'passed' ? '' : 'q-faint'}`}>
                {m.status === 'passed' ? `+${m.payout ?? 0}` : '—'}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
