import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { Domain, LedgerSource } from './types'
import { today } from './time'

type DB = SupabaseClient<Database>

type Entry = {
  source: LedgerSource
  source_id: string
  domain?: Domain | null
  note?: string | null
  occurred_on?: string
}

/**
 * Make the total Q$ recorded for (source, source_id) equal `desired`.
 *
 * Paid rows are history and never touched — pending rows are replaced
 * by a single row covering the difference. Returns the net Q$ change. So toggling something done →
 * undone → done again never double counts, even across a payday.
 */
export async function settle(db: DB, entry: Entry, desired: number): Promise<number> {
  const { data: rows, error } = await db
    .from('q_ledger')
    .select('id, amount, status')
    .eq('source', entry.source)
    .eq('source_id', entry.source_id)
    .neq('status', 'void')
  if (error) throw error

  const paid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending = rows.filter(r => r.status === 'pending')
  const want = desired - paid
  const delta = desired - paid - pending.reduce((s, r) => s + r.amount, 0)

  if (pending.length === 1 && pending[0].amount === want) return 0
  if (pending.length) {
    const { error } = await db.from('q_ledger').delete().in('id', pending.map(r => r.id))
    if (error) throw error
  }
  if (want !== 0) await add(db, entry, want)
  return delta
}

/** Append a pending row. */
export async function add(db: DB, entry: Entry, amount: number, status: 'pending' | 'paid' = 'pending') {
  const { error } = await db.from('q_ledger').insert({
    amount,
    status,
    source: entry.source,
    source_id: entry.source_id,
    domain: entry.domain ?? null,
    note: entry.note ?? null,
    occurred_on: entry.occurred_on ?? today(),
  })
  if (error) throw error
}

export async function getBalances(db: DB) {
  const { data, error } = await db.rpc('q_balances')
  if (error) throw error
  const row = data[0]
  return { balance: Number(row?.balance ?? 0), pending: Number(row?.pending ?? 0) }
}
