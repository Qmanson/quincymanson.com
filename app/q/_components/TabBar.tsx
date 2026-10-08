'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const TABS = [
  { href: '/q', icon: '◉', label: 'today', match: (p: string) => p === '/q' },
  { href: '/q/domains', icon: '◇', label: 'life', match: (p: string) => p.startsWith('/q/domains') || p.startsWith('/q/d/') },
  { href: '/q/missions', icon: '★', label: 'missions', match: (p: string) => p.startsWith('/q/missions') },
  { href: '/q/shop', icon: '$', label: 'shop', match: (p: string) => p.startsWith('/q/shop') },
  { href: '/q/more', icon: '≡', label: 'more', match: (p: string) => p.startsWith('/q/more') || p.startsWith('/q/review') || p.startsWith('/q/ledger') },
]

export default function TabBar() {
  const pathname = usePathname()
  // Light the tapped tab immediately instead of waiting for the route.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null)
  const pending = tapped && tapped.from === pathname ? tapped.href : null

  return (
    <nav className="q-tabbar">
      {TABS.map(t => {
        const on = pending ? pending === t.href : t.match(pathname)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`q-tab ${on ? 'is-on' : ''}`}
            onClick={() => setTapped({ href: t.href, from: pathname })}
          >
            <span className="q-tab-icon">{t.icon}</span>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
