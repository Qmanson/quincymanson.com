'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/q', icon: '◉', label: 'today', match: (p: string) => p === '/q' },
  { href: '/q/domains', icon: '◇', label: 'life', match: (p: string) => p.startsWith('/q/domains') || p.startsWith('/q/d/') },
  { href: '/q/missions', icon: '★', label: 'missions', match: (p: string) => p.startsWith('/q/missions') },
  { href: '/q/shop', icon: '$', label: 'shop', match: (p: string) => p.startsWith('/q/shop') },
  { href: '/q/more', icon: '≡', label: 'more', match: (p: string) => p.startsWith('/q/more') || p.startsWith('/q/review') || p.startsWith('/q/ledger') },
]

export default function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="q-tabbar">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={`q-tab ${t.match(pathname) ? 'is-on' : ''}`}>
          <span className="q-tab-icon">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
