'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
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
  /** Tapping the row (not the box) opens this… */
  onOpen?: () => void
  /** …or goes here. */
  href?: string
}

/**
 * Only the box ticks. The rest of the row opens details (onOpen / href),
 * or nudges the box if there's nowhere to go.
 */
export default function CheckRow({ title, sub, value, done, domain, missed, onToggle, oneWay, onOpen, href }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [pending, start] = useTransition()
  const [nudge, setNudge] = useState(0)

  function set(next: boolean, withUndo: boolean) {
    start(async () => {
      setOptimistic(next)
      try {
        const q = unwrap(await onToggle(next))
        toast(q, {
          label: `${next ? '✓' : '○'} ${title.length > 28 ? title.slice(0, 27) + '…' : title}`,
          undo: withUndo && !oneWay ? () => set(!next, false) : undefined,
        })
      } catch (e) {
        toast(`✕ ${e instanceof Error ? e.message : 'failed'}`)
      }
    })
  }

  function tapBox() {
    if (pending || (oneWay && optimistic)) return
    if (navigator.vibrate) navigator.vibrate(8)
    set(!optimistic, true)
  }

  const body = (
    <>
      <span className="q-row-main">
        <span className="q-row-title">{title}</span>
        {sub && <span className="q-row-sub q-row-meta">{sub}</span>}
      </span>
      <span className="q-value">+{value}</span>
      {(onOpen || href) && <span className="q-chev">›</span>}
    </>
  )

  return (
    <div data-d={domain} className={`q-row q-check ${optimistic ? 'is-done' : ''}`}>
      <button
        type="button"
        className="q-box-hit"
        aria-label={optimistic ? `untick ${title}` : `tick ${title}`}
        onClick={tapBox}
      >
        <span key={nudge} className={`q-box ${missed && !optimistic ? 'is-missed' : ''} ${nudge ? 'is-nudged' : ''}`}>
          {optimistic ? '✓' : missed ? '!' : ''}
        </span>
      </button>
      {href ? (
        <Link href={href} className="q-check-body">{body}</Link>
      ) : (
        <button type="button" className="q-check-body" onClick={() => (onOpen ? onOpen() : setNudge(n => n + 1))}>
          {body}
        </button>
      )}
    </div>
  )
}
