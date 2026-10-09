import Link from 'next/link'
import type { PersonStats } from '@/lib/q/social'
import { relativeDay } from '@/lib/q/time'
import NewThing from './NewThing'

/** Circle of friends: a line between two people each time they hung out together. */
function Graph({ stats, edges }: { stats: PersonStats[]; edges: { a: string; b: string; n: number }[] }) {
  const nodes = stats.filter(s => s.count > 0)
  if (nodes.length < 2) return null
  const R = 120
  const C = 150
  const pos = new Map(
    nodes.map((s, i) => {
      const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
      return [s.id, { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }]
    }),
  )
  const maxN = Math.max(1, ...edges.map(e => e.n))
  const maxC = Math.max(1, ...nodes.map(n => n.count))
  return (
    <svg viewBox="0 0 300 300" className="q-graph" role="img" aria-label="who you hang out with together">
      {edges.filter(e => pos.has(e.a) && pos.has(e.b)).map(e => {
        const a = pos.get(e.a)!
        const b = pos.get(e.b)!
        return (
          <path
            key={e.a + e.b}
            d={`M${a.x},${a.y} Q${C},${C} ${b.x},${b.y}`}
            stroke="var(--d)"
            strokeOpacity={0.25 + 0.6 * (e.n / maxN)}
            strokeWidth={1 + 3 * (e.n / maxN)}
            fill="none"
          />
        )
      })}
      {nodes.map(s => {
        const p = pos.get(s.id)!
        const r = 4 + 6 * (s.count / maxC)
        const right = Math.cos(p.a) >= 0
        return (
          <a key={s.id} href={`/q/person/${s.id}`}>
            <circle cx={p.x} cy={p.y} r={r} fill="var(--d)" style={{ filter: 'drop-shadow(0 0 4px var(--d))' }} />
            <text
              x={p.x + (right ? r + 4 : -(r + 4))}
              y={p.y + 4}
              textAnchor={right ? 'start' : 'end'}
              fontSize="11"
              fill="var(--ink)"
            >
              {s.name}
            </text>
          </a>
        )
      })}
    </svg>
  )
}

export default function People({ stats, edges }: { stats: PersonStats[]; edges: { a: string; b: string; n: number }[] }) {
  const sorted = [...stats].sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || a.name.localeCompare(b.name))
  return (
    <section className="q-panel" data-d="crew">
      <div className="q-panel-title">
        <span>▸ <b>people</b></span>
        <NewThing kind="person" />
      </div>
      <Graph stats={stats} edges={edges} />
      {sorted.length === 0 && <p className="q-empty">people you add to hangs show up here</p>}
      {sorted.map(p => (
        <Link key={p.id} href={`/q/person/${p.id}`} className="q-row">
          <span className="q-row-main">
            <span className="q-row-title">{p.name}</span>
            <span className="q-row-sub q-row-meta">
              <span>{p.last ? `seen ${relativeDay(p.last)}` : 'not seen yet'}</span>
              {p.every && <span>~every {p.every}d</span>}
              {p.with[0] && <span>often with {p.with[0].name}</span>}
            </span>
          </span>
          <span className="q-value">{p.count}</span>
          <span className="q-chev">›</span>
        </Link>
      ))}
    </section>
  )
}
