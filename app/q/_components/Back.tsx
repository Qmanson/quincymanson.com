'use client'

import { usePathname, useRouter } from 'next/navigation'

const ROOTS = new Set(['/q', '/q/domains', '/q/missions', '/q/shop', '/q/more'])

/** Fallback when there's no history (e.g. the app was just opened on this page). */
function parentOf(path: string): string {
  if (path.startsWith('/q/d/')) return '/q/domains'
  if (path.startsWith('/q/p/')) return '/q/domains'
  if (path.startsWith('/q/job/')) return '/q/d/admn'
  if (path.startsWith('/q/shop/')) return '/q/shop'
  if (path.startsWith('/q/review/') || path.startsWith('/q/ledger')) return '/q/more'
  return '/q'
}

export default function Back() {
  const pathname = usePathname()
  const router = useRouter()
  if (ROOTS.has(pathname)) {
    return <span className="q-logo">q<span className="q-blink">_</span></span>
  }
  return (
    <button
      type="button"
      className="q-back"
      aria-label="back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(parentOf(pathname)))}
    >
      <span className="q-back-arrow">‹</span>
      <span className="q-logo" style={{ fontSize: 26 }}>q</span>
    </button>
  )
}
