'use client'

import { useTransition } from 'react'

interface Props {
  action: () => Promise<void>
  confirmMessage: string
  label: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Renders a button inside a form whose action is a server action.
 * Asks for confirmation before submitting. Used wherever a Server
 * Component needs a "delete with confirm" affordance — Server
 * Components can't pass onClick handlers to buttons directly.
 */
export default function ConfirmDeleteForm({
  action,
  confirmMessage,
  label,
  style,
}: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (!confirm(confirmMessage)) return
        startTransition(() => action())
      }}
      disabled={pending}
      style={style}
    >
      {pending ? '...' : label}
    </button>
  )
}
