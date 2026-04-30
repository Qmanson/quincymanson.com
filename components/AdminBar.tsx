'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ADMIN_BAR } from '@/lib/content'

export default function AdminBar() {
  const pathname = usePathname()
  const links = getContextLinks(pathname)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: '#c0c0c0', borderTop: '2px solid #fff', boxShadow: '0 -2px 0 #404040' }}
    >
      <div className="max-w-3xl mx-auto px-4 py-1.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2" style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
          <span style={{
            background: '#00ff00', color: '#000', padding: '0 4px',
            border: '1px solid #404040', fontWeight: 'bold',
          }}>{ADMIN_BAR.badge}</span>
          <span style={{ color: '#404040' }}>{ADMIN_BAR.user}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="btn"
              style={{
                textDecoration: 'none',
                fontFamily: 'Courier New, monospace',
                fontSize: 11,
                padding: '1px 8px',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function getContextLinks(pathname: string): readonly { href: string; label: string }[] {
  if (pathname.startsWith('/blog')) return ADMIN_BAR.blogActions
  if (pathname.startsWith('/art')) return ADMIN_BAR.artActions
  if (pathname.startsWith('/trackers')) return ADMIN_BAR.trackerActions
  if (pathname.startsWith('/links')) return ADMIN_BAR.linkActions
  return []
}
