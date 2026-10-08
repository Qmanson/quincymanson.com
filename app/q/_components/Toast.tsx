'use client'

import { useEffect, useState } from 'react'

const EVENT = 'q:toast'

/** Flash a Q$ change (or any short message) above the tab bar. */
export function toast(msg: number | string) {
  if (msg === 0) return
  window.dispatchEvent(new CustomEvent(EVENT, { detail: msg }))
}

export default function Toaster() {
  const [msg, setMsg] = useState<{ text: string; neg: boolean; key: number } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function onToast(e: Event) {
      const d = (e as CustomEvent<number | string>).detail
      const text = typeof d === 'number' ? `${d > 0 ? '+' : '−'}${Math.abs(d)} Q$` : d
      setMsg({ text, neg: typeof d === 'number' && d < 0, key: Date.now() })
      clearTimeout(timer)
      timer = setTimeout(() => setMsg(null), 1400)
    }
    window.addEventListener(EVENT, onToast)
    return () => { window.removeEventListener(EVENT, onToast); clearTimeout(timer) }
  }, [])

  if (!msg) return null
  return <div key={msg.key} className={`q-toast ${msg.neg ? 'is-neg' : ''}`}>{msg.text}</div>
}
