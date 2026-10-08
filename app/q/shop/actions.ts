'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { add, getBalances } from '@/lib/q/ledger'
import { BUCKET } from '@/lib/q/media'
import { getRate, setRate } from '@/lib/q/rate'
import { addDays, dateOf, today } from '@/lib/q/time'
import { DOMAINS, type Crop, type Domain, type QReward } from '@/lib/q/types'

const CATEGORIES: QReward['category'][] = ['want', 'treat', 'experience', 'other']

function str(f: FormData, k: string): string | null {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Apply a changed exchange rate first, then work out this item's Q$ cost. */
async function priced(db: Awaited<ReturnType<typeof qAction>>, f: FormData) {
  let rate = await getRate(db)
  const asked = Number(str(f, 'rate'))
  if (Number.isFinite(asked) && asked > 0 && asked !== rate) {
    await setRate(db, asked)
    rate = asked
  }
  const usd = Number(str(f, 'usd_price'))
  const usd_price = Number.isFinite(usd) && usd > 0 ? Math.round(usd * 100) / 100 : null
  const cost = usd_price !== null ? Math.round(usd_price * rate) : Math.round(Number(str(f, 'cost')))
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('set a price')
  return { usd_price, cost }
}

function cropOf(f: FormData, k: string): Crop | null {
  try {
    const c = JSON.parse(str(f, k) ?? 'null')
    return c && typeof c.x === 'number' ? { x: c.x, y: c.y, z: c.z } : null
  } catch {
    return null
  }
}

function fields(f: FormData, price: { usd_price: number | null; cost: number }) {
  const title = str(f, 'title')
  if (!title) throw new Error('title is required')
  const category = (str(f, 'category') ?? 'want') as QReward['category']
  const d = str(f, 'domain')
  return {
    title,
    ...price,
    category: CATEGORIES.includes(category) ? category : 'want',
    domain: d && (DOMAINS as readonly string[]).includes(d) ? (d as Domain) : null,
    repeatable: f.get('repeatable') === 'on',
    cooldown_days: Number(str(f, 'cooldown_days')) || null,
    url: str(f, 'url'),
    image_url: str(f, 'image_url'),
    image_crop: cropOf(f, 'image_crop'),
    notes: str(f, 'notes'),
    // only replace an uploaded picture when a new one was picked
    ...(str(f, 'image_path') ? { image_path: str(f, 'image_path') } : {}),
  }
}

export const createReward = act(async function createReward(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_rewards').insert(fields(f, await priced(db, f)))
  if (error) throw error
  revalidatePath('/q', 'layout')
})

export const updateReward = act(async function updateReward(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_rewards').update(fields(f, await priced(db, f))).eq('id', id)
  if (error) throw error
  revalidatePath('/q', 'layout')
})

export const removeRewardImage = act(async function removeRewardImage(id: string) {
  const db = await qAction()
  const { data: r } = await db.from('q_rewards').select('image_path').eq('id', id).single()
  if (r?.image_path) await db.storage.from(BUCKET).remove([r.image_path])
  await db.from('q_rewards').update({ image_path: null, image_url: null }).eq('id', id)
  revalidatePath('/q', 'layout')
})

export const retireReward = act(async function retireReward(id: string) {
  const db = await qAction()
  await db.from('q_rewards').update({ status: 'retired' }).eq('id', id)
  revalidatePath('/q', 'layout')
})

/** Spend Q$. Returns the (negative) change. */
export const buyReward = act(async function buyReward(id: string): Promise<number> {
  const db = await qAction()
  const { data: r, error } = await db.from('q_rewards').select('*').eq('id', id).single()
  if (error) throw error
  if (r.status !== 'available') throw new Error('not available')

  const { balance } = await getBalances(db)
  if (balance < 0) throw new Error('shop is locked while you’re in debt')
  if (balance < r.cost) throw new Error(`need ${r.cost - balance} more Q$`)

  if (r.cooldown_days) {
    const { data: last } = await db
      .from('q_purchases')
      .select('purchased_at')
      .eq('reward_id', id)
      .order('purchased_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last && addDays(dateOf(last.purchased_at), r.cooldown_days) > today()) {
      throw new Error(`cooling down until ${addDays(dateOf(last.purchased_at), r.cooldown_days)}`)
    }
  }

  const { data: p, error: e } = await db.from('q_purchases').insert({ reward_id: id, cost: r.cost }).select('id').single()
  if (e) throw e
  await add(db, { source: 'purchase', source_id: p.id, domain: r.domain, note: r.title }, -r.cost, 'paid')
  if (!r.repeatable) await db.from('q_rewards').update({ status: 'bought' }).eq('id', id)
  revalidatePath('/q', 'layout')
  return -r.cost
})
