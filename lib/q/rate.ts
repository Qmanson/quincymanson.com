import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

type DB = SupabaseClient<Database>

/** Q$ per real dollar when nothing's been set. */
export const DEFAULT_RATE = 20

export async function getRate(db: DB): Promise<number> {
  const { data } = await db.from('q_state').select('value').eq('key', 'usd_rate').maybeSingle()
  const n = Number(data?.value)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE
}

/** Change the exchange rate and reprice every dollar-priced item still for sale. */
export async function setRate(db: DB, rate: number) {
  await db.from('q_state').upsert({ key: 'usd_rate', value: String(rate), updated_at: new Date().toISOString() })
  const { data: priced } = await db
    .from('q_rewards')
    .select('id, usd_price')
    .not('usd_price', 'is', null)
    .eq('status', 'available')
  await Promise.all(
    (priced ?? []).map(r =>
      db.from('q_rewards').update({ cost: Math.round(Number(r.usd_price) * rate) }).eq('id', r.id),
    ),
  )
}
