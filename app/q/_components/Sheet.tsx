'use client'

import { useEffect, useRef, useState } from 'react'

// Drag the top of a sheet down past this many px to dismiss it.
const DISMISS_PX = 90

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
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<number | null>(null)
  // onClose is usually an inline arrow; keep the effect from re-running on every render
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.dataset.qSheet = ''
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      delete document.documentElement.dataset.qSheet
    }
  }, [open])

  if (!open) return null

  const handle = {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = e.clientY
      setDragging(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
    },
    onPointerUp: () => {
      if (start.current === null) return
      start.current = null
      setDragging(false)
      setDrag(0)
      if (drag > DISMISS_PX) onClose()
    },
    onPointerCancel: () => {
      start.current = null
      setDragging(false)
      setDrag(0)
    },
  }

  return (
    <>
      <div className="q-scrim" onClick={onClose} style={{ opacity: Math.max(0.2, 1 - drag / 300) }} />
      <div
        className="q-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.18s ease-out',
        }}
      >
        <div className="q-sheet-handle" {...handle}>
          <div className="q-sheet-grip" />
          <div className="q-sheet-title">{title}</div>
        </div>
        {children}
      </div>
    </>
  )
}
