'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ROOTS = new Set(['/q', '/q/domains', '/q/missions', '/q/shop', '/q/more'])

/** Where "back" goes from a sub-page — a fixed flow, so it works on a fresh app open too. */
function parentOf(path: string): string {
  if (path.startsWith('/q/d/')) return '/q/domains'
  if (path.startsWith('/q/shop/')) return '/q/shop'
  if (path.startsWith('/q/review/') || path.startsWith('/q/ledger')) return '/q/more'
  return '/q'
}

export default function Back() {
  const pathname = usePathname()
  if (ROOTS.has(pathname)) {
    return <span className="q-logo">q<span className="q-blink">_</span></span>
  }
  return (
    <Link href={parentOf(pathname)} className="q-back" aria-label="back">
      <span className="q-back-arrow">‹</span>
      <span className="q-logo" style={{ fontSize: 26 }}>q</span>
    </Link>
  )
}
