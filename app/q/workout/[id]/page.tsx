import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { workoutStats } from '@/lib/q/workouts'
import { formatShort, relativeDay } from '@/lib/q/time'
import WorkoutSettings from './WorkoutSettings'

/** Line chart of estimated 1-rep max per session, with your set max as a dashed line. */
function Chart({ points, max }: { points: { day: string; v: number }[]; max: number | null }) {
  if (points.length < 2) return <p className="q-empty">log this a couple more times to see a graph</p>
  const W = 320
  const H = 160
  const P = 24
  const vals = [...points.map(p => p.v), ...(max ? [max] : [])]
  const lo = Math.min(...vals) * 0.95
  const hi = Math.max(...vals) * 1.05
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P)
  const y = (v: number) => H - P - ((v - lo) / (hi - lo || 1)) * (H - 2 * P)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="estimated max over time">
      {max && (
        <>
          <line x1={P} x2={W - P} y1={y(max)} y2={y(max)} stroke="var(--warn)" strokeDasharray="4 4" strokeOpacity={0.7} />
          <text x={W - P} y={y(max) - 4} textAnchor="end" fontSize="10" fill="var(--warn)">max {max}</text>
        </>
      )}
      <path d={d} fill="none" stroke="var(--phosphor)" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 4px var(--phosphor))' }} />
      {points.map((p, i) => <circle key={p.day} cx={x(i)} cy={y(p.v)} r={3} fill="var(--phosphor)" />)}
      <text x={P} y={H - 6} fontSize="10" fill="var(--faint)">{formatShort(points[0].day)}</text>
      <text x={W - P} y={H - 6} fontSize="10" fill="var(--faint)" textAnchor="end">{formatShort(points[points.length - 1].day)}</text>
    </svg>
  )
}

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const w = (await workoutStats(db)).find(x => x.id === id)
  if (!w) notFound()
  const points = w.sessions.filter(s => s.best !== null).map(s => ({ day: s.day, v: s.best as number }))

  return (
    <main className="q-main" data-d="body">
      <div>
        <div className="q-tiny q-dim">workout · {w.value_per_rep} Q$ per rep at your max</div>
        <h1 className="q-h1">{w.name}</h1>
      </div>

      <section className="q-panel">
        <div className="q-panel-body q-stats">
          <div><div className="q-value" style={{ fontSize: 26 }}>{w.max_weight ?? '—'}</div><div className="q-tiny q-faint">your max</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{w.best ?? '—'}</div><div className="q-tiny q-faint">est. best</div></div>
          <div><div className="q-value" style={{ fontSize: 26 }}>{w.sessions.length}</div><div className="q-tiny q-faint">sessions</div></div>
        </div>
        {w.best && w.max_weight && w.best > Number(w.max_weight) && (
          <p className="q-small q-pos" style={{ textAlign: 'center', paddingBottom: 12 }}>
            est. best is above your max. time to raise it?
          </p>
        )}
      </section>

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>progress</b></span><span>est. 1-rep max</span></div>
        <div className="q-panel-body"><Chart points={points} max={w.max_weight ? Number(w.max_weight) : null} /></div>
      </section>

      <WorkoutSettings workout={w} />

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>sessions</b></span></div>
        {w.sessions.length === 0 && <p className="q-empty">no sessions yet</p>}
        {[...w.sessions].reverse().map(s => (
          <div key={s.day} className="q-row" style={{ minHeight: 44 }}>
            <span className="q-row-main">
              <span className="q-row-title">{relativeDay(s.day)}</span>
              <span className="q-row-sub">
                {s.sets.map(x => `${x.sets ?? 1}×${x.reps ?? '?'}${x.weight ? ` @ ${x.weight}` : ''}`).join(' · ')}
              </span>
            </span>
            <span className="q-value">+{s.q}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
