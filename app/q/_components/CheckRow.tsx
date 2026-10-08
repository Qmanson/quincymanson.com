'use client'

import { useOptimistic, useTransition } from 'react'
import type { Domain } from '@/lib/q/types'
import { toast } from './Toast'
import { unwrap, type ActError } from '@/lib/q/act'

type Props = {
  title: string
  sub?: React.ReactNode
  value: number
  done: boolean
  domain: Domain
  missed?: boolean
  /** Called with the new state; resolves to the Q$ change. */
  onToggle: (on: boolean) => Promise<number | ActError>
  /** Rows that can only be checked, never unchecked (e.g. late). */
  oneWay?: boolean
  /** Shows a ⋯ button at the end of the row. */
  onMore?: () => void
}

export default function CheckRow({ title, sub, value, done, domain, missed, onToggle, oneWay, onMore }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [pending, start] = useTransition()

  function tap() {
    if (pending || (oneWay && optimistic)) return
    const next = !optimistic
    if (navigator.vibrate) navigator.vibrate(8)
    start(async () => {
      setOptimistic(next)
      try {
        toast(unwrap(await onToggle(next)))
      } catch (e) {
        toast(`✕ ${e instanceof Error ? e.message : 'failed'}`)
      }
    })
  }

  return (
    <div data-d={domain} className={`q-row q-check ${optimistic ? 'is-done' : ''}`}>
      <button type="button" className="q-check-hit" onClick={tap}>
        <span className={`q-box ${missed && !optimistic ? 'is-missed' : ''}`}>{optimistic ? '✓' : missed ? '!' : ''}</span>
        <span className="q-row-main">
          <span className="q-row-title">{title}</span>
          {sub && <span className="q-row-sub" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{sub}</span>}
        </span>
        <span className="q-value">+{value}</span>
      </button>
      {onMore && (
        <button type="button" className="q-more" aria-label="edit" onClick={onMore}>⋯</button>
      )}
    </div>
  )
}
