import Link from 'next/link'
import type { WorkoutStats } from '@/lib/q/workouts'
import { relativeDay } from '@/lib/q/time'

export default function Workouts({ workouts }: { workouts: WorkoutStats[] }) {
  if (!workouts.length) return null
  const sorted = [...workouts].sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''))
  return (
    <section className="q-panel" data-d="body">
      <div className="q-panel-title"><span>▸ <b>workouts</b></span><span>max · est. best</span></div>
      {sorted.map(w => (
        <Link key={w.id} href={`/q/workout/${w.id}`} className="q-row">
          <span className="q-row-main">
            <span className="q-row-title">{w.name}</span>
            <span className="q-row-sub q-row-meta">
              <span>{w.sessions.length} sessions</span>
              {w.last && <span>last {relativeDay(w.last)}</span>}
              <span>{w.value_per_rep} Q$/rep</span>
            </span>
          </span>
          <span className="q-small" style={{ textAlign: 'right' }}>
            <span className="q-pos">{w.max_weight ?? '—'}</span>
            <span className="q-faint"> · {w.best ?? '—'}</span>
          </span>
          <span className="q-chev">›</span>
        </Link>
      ))}
    </section>
  )
}
