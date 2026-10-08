import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import LinksClient from './LinksClient'
import { LINKS } from '@/lib/content'

export default async function LinksPage() {
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: links } = await supabase
    .from('links').select('*').order('found_at', { ascending: false })

  const allTags = Array.from(new Set((links ?? []).flatMap(l => l.tags))).sort()

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>{LINKS.windowTitle}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <h1 style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: 30,
          fontWeight: 'bold',
          color: 'var(--accent)',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          {LINKS.pageHeading}
        </h1>
        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '10px 0 16px' }} />

        <LinksClient links={links ?? []} allTags={allTags} isAdmin={admin} />
      </div>
    </div>
  )
}
