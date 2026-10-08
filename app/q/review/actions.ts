'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { claim, reviewPeriod, type ReviewCadence } from '@/lib/q/payday'
import { REVIEW_BONUS } from '@/lib/q/points'
import { quarterStart, yearStart, today } from '@/lib/q/time'

const CADENCES: ReviewCadence[] = ['weekly', 'monthly', 'quarterly', 'yearly']

function str(f: FormData, k: string): string | null {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Finish a review: save notes, add the bonus, and (weekly) run payday. Returns Q$ claimed. */
export const completeReview = act(async function completeReview(cadence: ReviewCadence, f: FormData): Promise<number> {
  if (!CADENCES.includes(cadence)) throw new Error('bad cadence')
  const db = await qAction()

  const { data: past } = await db.from('q_reviews').select('period_start').eq('cadence', cadence).not('completed_at', 'is', null)
  const period_start = reviewPeriod(cadence, new Set((past ?? []).map(r => r.period_start)))
  if (!period_start) throw new Error('reviews open on sundays')

  const answers: Record<string, string> = {}
  for (const k of ['grade', 'wins', 'misses', 'next']) {
    const v = str(f, k)
    if (v) answers[k] = v
  }

  const { data: review, error } = await db
    .from('q_reviews')
    .upsert(
      { cadence, period_start, notes: str(f, 'notes'), answers, completed_at: new Date().toISOString() },
      { onConflict: 'cadence,period_start' },
    )
    .select('id')
    .single()
  if (error) throw error

  await settle(db, { source: 'review', source_id: review.id, note: `${cadence} review`, occurred_on: today() }, REVIEW_BONUS[cadence])

  let claimed = 0
  if (cadence === 'weekly') {
    const { net, paydayId } = await claim(db)
    claimed = net
    if (paydayId) await db.from('q_reviews').update({ payday_id: paydayId }).eq('id', review.id)
  }

  revalidatePath('/q', 'layout')
  return claimed || REVIEW_BONUS[cadence]
})

/** Set the yearly theme or this quarter's sub-theme. */
export const setTheme = act(async function setTheme(scope: 'year' | 'quarter', f: FormData) {
  const db = await qAction()
  const title = str(f, 'title')
  if (!title) throw new Error('theme needs a title')
  const t = today()
  const { error } = await db.from('q_themes').upsert(
    { scope, period_start: scope === 'year' ? yearStart(t) : quarterStart(t), title, notes: str(f, 'notes') },
    { onConflict: 'scope,period_start' },
  )
  if (error) throw error
  revalidatePath('/q', 'layout')
})
