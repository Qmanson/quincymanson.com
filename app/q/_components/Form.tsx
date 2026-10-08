'use client'

import { useState, useTransition } from 'react'
import { toast } from './Toast'

/**
 * Form that runs a server action, shows errors inline and calls onDone
 * on success. Action may return a Q$ delta to flash.
 */
export default function QForm({
  action,
  onDone,
  submit = 'save',
  children,
}: {
  action: (f: FormData) => Promise<unknown>
  onDone?: () => void
  submit?: string
  children: React.ReactNode
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      className="q-form"
      onSubmit={e => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        setError(null)
        start(async () => {
          try {
            const r = await action(f)
            if (typeof r === 'number') toast(r)
            onDone?.()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'something broke')
          }
        })
      }}
    >
      {children}
      {error && <p className="q-neg q-small">✕ {error}</p>}
      <button type="submit" className="q-btn is-primary is-block" disabled={pending}>
        {pending ? '…' : submit}
      </button>
    </form>
  )
}
