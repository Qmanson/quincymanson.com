import Link from 'next/link'
import { NOT_FOUND } from '@/lib/content'

export default function NotFound() {
  return (
    <div className="window max-w-md mx-auto mt-12">
      <div className="window-titlebar" style={{ background: '#a00' }}>
        <span>{NOT_FOUND.windowTitle}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body" style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 64, margin: 0, fontFamily: 'Courier New, monospace', color: '#a00', fontWeight: 'bold' }}>
          {NOT_FOUND.bigCode}
        </p>
        <p className="label" style={{ fontSize: 13, marginTop: 8 }}>{NOT_FOUND.primary}</p>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: 12, marginTop: 12, color: '#666' }}>
          {NOT_FOUND.secondary}
        </p>
        <p style={{ marginTop: 16 }}>
          <Link href="/">{NOT_FOUND.homeLink}</Link>
        </p>
      </div>
    </div>
  )
}
