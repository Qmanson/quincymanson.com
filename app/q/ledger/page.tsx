import { qPage } from '@/lib/q/db'
import { formatQ } from '@/lib/q/points'
import { relativeDay } from '@/lib/q/time'

export default async function Ledger() {
  const db = await qPage()
  const [{ data: rows }, { data: paydays }] = await Promise.all([
    db.from('q_ledger').select('*').neq('status', 'void').order('created_at', { ascending: false }).limit(150),
    db.from('q_paydays').select('*').order('claimed_at', { ascending: false }).limit(8),
  ])

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">every Q$ in and out</div>
        <h1 className="q-h1">ledger</h1>
      </div>

      {paydays && paydays.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>paydays</b></span></div>
          {paydays.map(p => (
            <div key={p.id} className="q-row" style={{ minHeight: 44 }}>
              <span className="q-row-main">
                <span className="q-row-title" style={{ display: 'block' }}>week of {p.week_start}</span>
                <span className="q-row-sub">+{formatQ(p.gross)} · {formatQ(p.deductions)}{p.decay ? ` · decay −${formatQ(p.decay)}` : ''}</span>
              </span>
              <span className="q-value">{formatQ(p.net)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>entries</b></span></div>
        {(rows ?? []).length === 0 && <p className="q-empty">nothing yet</p>}
        {(rows ?? []).map(r => (
          <div key={r.id} className="q-row" data-d={r.domain ?? undefined} style={{ minHeight: 44 }}>
            <span className="q-dot" />
            <span className="q-row-main">
              <span className="q-row-title" style={{ display: 'block' }}>{r.note ?? r.source}</span>
              <span className="q-row-sub">{r.source} · {relativeDay(r.occurred_on)} · {r.status}</span>
            </span>
            <span className={r.amount < 0 ? 'q-value q-neg' : 'q-value'} style={{ opacity: r.status === 'pending' ? 0.6 : 1 }}>
              {r.amount > 0 ? '+' : ''}{formatQ(r.amount)}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}
