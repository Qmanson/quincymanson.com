'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/app/login/actions'
import { SITE, NAV } from '@/lib/content'

const NAV_LINKS = [
  { href: '/blog', label: NAV.blog },
  { href: '/art', label: NAV.art },
  { href: '/trackers', label: NAV.trackers },
  { href: '/links', label: NAV.links },
]

export default function Nav({ user }: { isAdmin: boolean; user: User | null }) {
  const pathname = usePathname()

  return (
    <div className="window mb-6">
      <div className="window-titlebar">
        <span>{SITE.navWindowTitle}</span>
        <span className="hidden sm:inline">_ □ ✕</span>
      </div>
      <div className="window-body" style={{ padding: '10px 16px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="label"
            style={{ fontSize: 14, fontWeight: 'bold', textDecoration: 'none', color: 'var(--ink)' }}
          >
            {SITE.navHomeLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className="btn"
                  style={{
                    textDecoration: 'none',
                    fontFamily: 'Courier New, monospace',
                    fontSize: 12,
                    fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#ffff99' : undefined,
                  }}
                >
                  [{label}]
                </Link>
              )
            })}
            {user ? (
              <form action={signOut}>
                <button type="submit" style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
                  {NAV.logout}
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="btn"
                style={{ textDecoration: 'none', fontFamily: 'Courier New, monospace', fontSize: 12 }}
              >
                {NAV.login}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
