'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { QReward } from '@/lib/q/types'
import { formatQ } from '@/lib/q/points'
import Sheet from '../../_components/Sheet'
import { toast } from '../../_components/Toast'
import { unwrap } from '@/lib/q/act'
import RewardForm from '../RewardForm'
import { buyReward, removeRewardImage, retireReward } from '../actions'

export default function ProductActions({
  reward: r,
  rate,
  imageSrc,
  canBuy,
}: {
  reward: QReward
  rate: number
  imageSrc: string | null
  canBuy: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<unknown>, after?: () => void) {
    start(async () => {
      try {
        const n = unwrap(await fn())
        if (typeof n === 'number') toast(n)
        after?.()
      } catch (e) {
        toast(e instanceof Error ? `✕ ${e.message}` : '✕ failed')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {r.status === 'available' && (
        <button
          className="q-btn is-primary is-block"
          style={{ minHeight: 54, fontSize: 15 }}
          disabled={!canBuy || pending}
          onClick={() => confirm(`spend ${formatQ(r.cost)} Q$ on ${r.title}?`) && run(() => buyReward(r.id))}
        >
          {canBuy ? `buy · Q$ ${formatQ(r.cost)}` : 'not enough Q$ yet'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {r.url && <a className="q-btn" style={{ flex: 1 }} href={r.url} target="_blank" rel="noreferrer">store ↗</a>}
        <button className="q-btn" style={{ flex: 1 }} onClick={() => setEditing(true)}>edit</button>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="edit">
        <RewardForm r={r} rate={rate} imageSrc={imageSrc} onDone={() => setEditing(false)} />
        {imageSrc && (
          <button className="q-btn is-block" style={{ marginTop: 10 }} disabled={pending} onClick={() => run(() => removeRewardImage(r.id), () => setEditing(false))}>
            remove picture
          </button>
        )}
        <button
          className="q-btn is-danger is-block"
          style={{ marginTop: 10 }}
          disabled={pending}
          onClick={() => confirm('remove from shop?') && run(() => retireReward(r.id), () => router.push('/q/shop'))}
        >
          remove from shop
        </button>
      </Sheet>
    </div>
  )
}
