'use client'

import { useEffect, useState } from 'react'

const EVENT = 'q:toast'

type Detail = { msg: number | string; label?: string; undo?: () => void }

/**
 * Flash a Q$ change (or any short message) above the tab bar. Pass a label
 * to say what changed, and undo to offer a one-tap revert.
 */
export function toast(msg: number | string, opts: { label?: string; undo?: () => void } = {}) {
  if (msg === 0 && !opts.label) return
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { msg, ...opts } }))
}

export default function Toaster() {
  const [t, setT] = useState<(Detail & { key: number }) | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function onToast(e: Event) {
      const d = (e as CustomEvent<Detail>).detail
      setT({ ...d, key: Date.now() })
      clearTimeout(timer)
      timer = setTimeout(() => setT(null), d.undo ? 4000 : 1600)
    }
    window.addEventListener(EVENT, onToast)
    return () => { window.removeEventListener(EVENT, onToast); clearTimeout(timer) }
  }, [])

  if (!t) return null
  const n = typeof t.msg === 'number' ? t.msg : null
  const neg = n !== null && n < 0
  const amount = n !== null && n !== 0 ? `${n > 0 ? '+' : '−'}${Math.abs(n)} Q$` : null
  const text = typeof t.msg === 'string' ? t.msg : null

  return (
    <div key={t.key} className={`q-toast ${neg ? 'is-neg' : ''} ${t.undo ? 'has-undo' : ''}`}>
      {t.label && <span className="q-toast-label">{t.label}</span>}
      {amount && <span>{amount}</span>}
      {text && <span>{text}</span>}
      {t.undo && (
        <button
          type="button"
          className="q-toast-undo"
          onClick={() => {
            t.undo?.()
            setT(null)
          }}
        >
          undo
        </button>
      )}
    </div>
  )
}
