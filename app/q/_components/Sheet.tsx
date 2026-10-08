'use client'

import { useEffect } from 'react'

export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="q-scrim" onClick={onClose} />
      <div className="q-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="q-sheet-grip" />
        <div className="q-sheet-title">{title}</div>
        {children}
      </div>
    </>
  )
}
