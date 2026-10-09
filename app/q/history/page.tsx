import Link from 'next/link'
import { qPage } from '@/lib/q/db'
import { formatQ } from '@/lib/q/points'
import { addDays, formatDow, formatShort, relativeDay, today } from '@/lib/q/time'
import type { Domain } from '@/lib/q/types'

type Item = { key: string; day: string; text: string; amount: number | null; domain: Domain | null; status?: string; kind: string }

const KIND_LABEL: Record<string, string> = {
  routine: 'routine', task: 'task', log: 'log', event: 'hang/event', shift: 'shift',
  mission: 'mission', purchase: 'shop', review: 'review', decay: 'decay', manual: 'manual',
}

/** Everything you did (and missed), day by day. */
export default async function History({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const db = await qPage()
  const t = today()
  const days = Math.min(365, Math.max(7, Number((await searchParams).days) || 21))
  const from = addDays(t, -days)

  const [{ data: ledger }, { data: logs }, { data: types }] = await Promise.all([
    db
      .from('q_ledger')
      .select('id, amount, status, source, source_id, domain, note, occurred_on')
      .neq('status', 'void')
      .gte('occurred_on', from)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000),
    db.from('q_logs').select('id, log_type_id, logged_on, amount, note').gte('logged_on', from).limit(2000),
    db.from('q_log_types').select('id, name, unit, domain'),
  ])

  const typeOf = new Map((types ?? []).map(x => [x.id, x]))
  const logsWithQ = new Set((ledger ?? []).filter(l => l.source === 'log').map(l => l.source_id))

  const items: Item[] = [
    ...(ledger ?? []).map(l => ({
      key: l.id,
      day: l.occurred_on,
      text: l.note ?? l.source,
      amount: l.amount,
      domain: l.domain,
      status: l.status,
      kind: l.source,
    })),
    // logs that pay nothing (food, sleep, substances…) still belong in history
    ...(logs ?? [])
      .filter(l => !logsWithQ.has(l.id))
      .map(l => {
        const lt = typeOf.get(l.log_type_id)
        const amt = l.amount !== null ? ` · ${l.amount}${lt?.unit ? ` ${lt.unit}` : ''}` : ''
        return {
          key: l.id,
          day: l.logged_on,
          text: `${lt?.name ?? 'log'}${amt}${l.note ? ` · ${l.note}` : ''}`,
          amount: null,
          domain: lt?.domain ?? null,
          kind: 'log',
        }
      }),
  ]

  const byDay = new Map<string, Item[]>()
  for (const it of items) byDay.set(it.day, [...(byDay.get(it.day) ?? []), it])
  const sortedDays = [...byDay.keys()].sort().reverse()

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">last {days} days</div>
        <h1 className="q-h1">history</h1>
      </div>

      {sortedDays.length === 0 && <p className="q-empty q-panel">nothing yet</p>}
      {sortedDays.map(d => {
        const list = byDay.get(d)!
        const net = list.reduce((s, x) => s + (x.amount ?? 0), 0)
        return (
          <section key={d} className="q-panel">
            <div className="q-panel-title">
              <span>▸ <b>{formatDow(d)} {formatShort(d)}</b> · {relativeDay(d, t)}</span>
              <span className={net < 0 ? 'q-neg' : 'q-pos'}>{net >= 0 ? '+' : ''}{formatQ(net)}</span>
            </div>
            {list.map(x => (
              <div key={x.key} className="q-row" data-d={x.domain ?? undefined} style={{ minHeight: 40 }}>
                <span className="q-dot" />
                <span className="q-row-main">
                  <span className="q-row-title" style={{ whiteSpace: 'normal' }}>{x.text}</span>
                  <span className="q-row-sub">{KIND_LABEL[x.kind] ?? x.kind}{x.status === 'pending' ? ' · pending' : ''}</span>
                </span>
                {x.amount !== null && (
                  <span className={x.amount < 0 ? 'q-value q-neg' : 'q-value'}>{x.amount > 0 ? '+' : ''}{formatQ(x.amount)}</span>
                )}
              </div>
            ))}
          </section>
        )
      })}

      <Link href={`/q/history?days=${days + 30}`} className="q-btn is-block">older →</Link>
    </main>
  )
}
