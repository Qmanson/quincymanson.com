import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { payStub, reviewPeriod, type ReviewCadence } from '@/lib/q/payday'
import { formatQ, REVIEW_BONUS } from '@/lib/q/points'
import { addDays, addMonths, formatDow, formatShort, quarterStart, today, yearStart } from '@/lib/q/time'
import ReviewForm from './ReviewForm'
import ThemeForm from './ThemeForm'

const CADENCES: ReviewCadence[] = ['weekly', 'monthly', 'quarterly', 'yearly']
const SPAN: Record<ReviewCadence, (s: string) => string> = {
  weekly: s => addDays(s, 6),
  monthly: s => addDays(addMonths(s, 1), -1),
  quarterly: s => addDays(addMonths(s, 3), -1),
  yearly: s => addDays(addMonths(s, 12), -1),
}

export default async function Review({ params }: { params: Promise<{ cadence: string }> }) {
  const { cadence: c } = await params
  if (!CADENCES.includes(c as ReviewCadence)) notFound()
  const cadence = c as ReviewCadence
  const db = await qPage()
  const t = today()

  const { data: past } = await db
    .from('q_reviews')
    .select('*')
    .eq('cadence', cadence)
    .order('period_start', { ascending: false })
    .limit(12)
  const completed = new Set((past ?? []).filter(r => r.completed_at).map(r => r.period_start))
  const start = reviewPeriod(cadence, completed, t)
  const end = SPAN[cadence](start)
  const existing = (past ?? []).find(r => r.period_start === start)
  const isDone = !!existing?.completed_at

  // Period stats: Q$ by domain from the ledger.
  const { data: ledger } = await db
    .from('q_ledger')
    .select('amount, domain, source')
    .neq('status', 'void')
    .gte('occurred_on', start)
    .lte('occurred_on', end)
    .limit(5000)
  const earned = (ledger ?? []).filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const lost = (ledger ?? []).filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)

  // Weekly: a 7-day grid of daily routine completion.
  let grid: { day: string; done: number; total: number }[] = []
  if (cadence === 'weekly') {
    const [{ data: daily }, { data: checks }] = await Promise.all([
      db.from('q_routines').select('id, starts_on, active').eq('cadence', 'daily'),
      db.from('q_routine_checks').select('routine_id, period_start, status').gte('period_start', start).lte('period_start', end),
    ])
    const dailyIds = new Set((daily ?? []).map(r => r.id))
    grid = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i)
      const total = (daily ?? []).filter(r => r.active && r.starts_on <= day).length
      const done = (checks ?? []).filter(
        ch => ch.period_start === day && dailyIds.has(ch.routine_id) && ch.status !== 'missed',
      ).length
      return { day, done, total }
    })
  }

  const stub = cadence === 'weekly' && !isDone ? await payStub(db, t) : null

  const [{ data: yearTheme }, { data: quarterTheme }] = await Promise.all([
    db.from('q_themes').select('*').eq('scope', 'year').eq('period_start', yearStart(t)).maybeSingle(),
    db.from('q_themes').select('*').eq('scope', 'quarter').eq('period_start', quarterStart(t)).maybeSingle(),
  ])

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">{formatShort(start)} – {formatShort(end)}</div>
        <h1 className="q-h1">{cadence} review</h1>
      </div>

      {grid.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>the week</b></span><span>dailies</span></div>
          <div className="q-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
            {grid.map(g => {
              const pct = g.total ? g.done / g.total : 0
              const future = g.day > t
              return (
                <div key={g.day}>
                  <div className="q-tiny q-faint">{formatDow(g.day).slice(0, 2)}</div>
                  <div
                    style={{
                      aspectRatio: '1',
                      borderRadius: 4,
                      marginTop: 4,
                      border: '1px solid var(--line)',
                      background: future ? 'transparent' : `rgba(124,255,178,${0.08 + pct * 0.75})`,
                      boxShadow: pct === 1 ? '0 0 10px rgba(124,255,178,.5)' : 'none',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      color: pct > 0.5 ? 'var(--bg)' : 'var(--dim)',
                    }}
                  >
                    {future ? '' : `${g.done}/${g.total}`}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>this {cadence.replace('ly', '')}</b></span></div>
        <div className="q-panel-body" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div><div className="q-value" style={{ fontSize: 28 }}>+{formatQ(earned)}</div><div className="q-tiny q-faint">earned</div></div>
          <div><div className="q-value q-neg" style={{ fontSize: 28 }}>{formatQ(lost)}</div><div className="q-tiny q-faint">lost</div></div>
        </div>
      </section>

      {(cadence === 'quarterly' || cadence === 'yearly') && (
        <ThemeForm
          scope={cadence === 'yearly' ? 'year' : 'quarter'}
          current={cadence === 'yearly' ? yearTheme : quarterTheme}
        />
      )}

      {stub && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>pay stub</b></span><span>payday</span></div>
          <div className="q-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            {stub.byDomain.map(d => (
              <div key={d.domain ?? 'none'} data-d={d.domain ?? undefined} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="q-tag">{d.domain ?? 'bonus'}</span>
                <span>
                  <span className="q-pos">+{formatQ(d.earned)}</span>
                  {d.lost < 0 && <span className="q-neg"> {formatQ(d.lost)}</span>}
                </span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--line)', margin: '6px 0' }} />
            <Line label="gross" value={stub.gross} />
            <Line label="deductions" value={stub.deductions} />
            {stub.decay > 0 && <Line label={`late decay (${stub.lateWeeks.length} wk)`} value={-stub.decay} />}
            <Line label={`review bonus`} value={REVIEW_BONUS.weekly} />
            <div style={{ borderTop: '1px dashed var(--line)', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="q-tiny">net pay</span>
              <span className="q-value" style={{ fontSize: 30 }}>Q$ {formatQ(stub.net + REVIEW_BONUS.weekly)}</span>
            </div>
          </div>
        </section>
      )}

      {isDone ? (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b className="q-pos">done ✓</b></span></div>
          <div className="q-panel-body q-small q-dim" style={{ whiteSpace: 'pre-wrap' }}>
            {existing?.notes || 'no notes'}
          </div>
        </section>
      ) : (
        <ReviewForm cadence={cadence} />
      )}
    </main>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="q-dim">{label}</span>
      <span className={value < 0 ? 'q-neg' : 'q-pos'}>{value >= 0 ? '+' : ''}{formatQ(value)}</span>
    </div>
  )
}
