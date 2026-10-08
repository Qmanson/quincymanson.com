'use client'

import { useState, useTransition } from 'react'
import { toast } from './Toast'

/**
 * Form that runs a server action. When there's an onDone (i.e. it lives in
 * a sheet) it closes immediately and the save finishes in the background —
 * the result or any error shows as a toast. Without onDone it waits and
 * shows errors inline.
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
        if (onDone) {
          onDone()
          toast('saving…')
          action(f)
            .then(r => toast(typeof r === 'number' && r !== 0 ? r : 'saved ✓'))
            .catch(err => toast(`✕ ${err instanceof Error ? err.message : 'didn’t save'}`))
          return
        }
        start(async () => {
          try {
            const r = await action(f)
            if (typeof r === 'number') toast(r)
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
