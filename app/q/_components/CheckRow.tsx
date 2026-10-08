'use client'

import { useOptimistic, useTransition } from 'react'
import type { Domain } from '@/lib/q/types'
import { toast } from './Toast'

type Props = {
  title: string
  sub?: React.ReactNode
  value: number
  done: boolean
  domain: Domain
  missed?: boolean
  /** Called with the new state; resolves to the Q$ change. */
  onToggle: (on: boolean) => Promise<number>
  /** Rows that can only be checked, never unchecked (e.g. late). */
  oneWay?: boolean
}

export default function CheckRow({ title, sub, value, done, domain, missed, onToggle, oneWay }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [pending, start] = useTransition()

  function tap() {
    if (pending || (oneWay && optimistic)) return
    const next = !optimistic
    if (navigator.vibrate) navigator.vibrate(8)
    start(async () => {
      setOptimistic(next)
      try {
        toast(await onToggle(next))
      } catch {
        toast('✕ failed')
      }
    })
  }

  return (
    <button type="button" data-d={domain} className={`q-row ${optimistic ? 'is-done' : ''}`} onClick={tap}>
      <span className={`q-box ${missed && !optimistic ? 'is-missed' : ''}`}>{optimistic ? '✓' : missed ? '!' : ''}</span>
      <span className="q-row-main">
        <span className="q-row-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="q-row-sub" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{sub}</span>}
      </span>
      <span className="q-value">+{value}</span>
    </button>
  )
}
