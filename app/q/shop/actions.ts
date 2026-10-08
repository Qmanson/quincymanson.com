'use server'

import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { add, getBalances } from '@/lib/q/ledger'
import { addDays, dateOf, today } from '@/lib/q/time'
import { DOMAINS, type Domain, type QReward } from '@/lib/q/types'

const CATEGORIES: QReward['category'][] = ['want', 'treat', 'experience', 'other']

function str(f: FormData, k: string): string | null {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function fields(f: FormData) {
  const title = str(f, 'title')
  if (!title) throw new Error('title is required')
  const cost = Math.round(Number(str(f, 'cost')))
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('set a price')
  const category = (str(f, 'category') ?? 'want') as QReward['category']
  const d = str(f, 'domain')
  return {
    title,
    cost,
    category: CATEGORIES.includes(category) ? category : 'want',
    domain: d && (DOMAINS as readonly string[]).includes(d) ? (d as Domain) : null,
    repeatable: f.get('repeatable') === 'on',
    cooldown_days: Number(str(f, 'cooldown_days')) || null,
    url: str(f, 'url'),
    notes: str(f, 'notes'),
  }
}

export async function createReward(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_rewards').insert(fields(f))
  if (error) throw error
  revalidatePath('/q', 'layout')
}

export async function updateReward(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_rewards').update(fields(f)).eq('id', id)
  if (error) throw error
  revalidatePath('/q', 'layout')
}

export async function retireReward(id: string) {
  const db = await qAction()
  await db.from('q_rewards').update({ status: 'retired' }).eq('id', id)
  revalidatePath('/q', 'layout')
}

/** Spend Q$. Returns the (negative) change. */
export async function buyReward(id: string): Promise<number> {
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
}
