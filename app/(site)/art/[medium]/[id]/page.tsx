import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ArtworkDetail from './ArtworkDetail'
import type { Artwork } from '@/lib/types'

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ medium: string; id: string }>
}) {
  const { medium: mediumSlug, id } = await params
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: artwork } = await supabase.from('artworks').select('*').eq('id', id).single()
  if (!artwork) notFound()

  const { data: medium } = await supabase.from('mediums').select('*').eq('slug', mediumSlug).single()
  const { data: allMediums } = await supabase.from('mediums').select('id, name, slug').order('name')

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>🖼 art/{mediumSlug}/{artwork.title.toLowerCase().slice(0, 16)}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: 12, marginBottom: 12 }}>
          <Link href="/art">art</Link>
          {' / '}
          <Link href={`/art/${mediumSlug}`}>{medium?.name ?? mediumSlug}</Link>
        </p>

        <ArtworkDetail
          artwork={artwork as Artwork}
          mediumSlug={mediumSlug}
          allMediums={allMediums ?? []}
          isAdmin={admin}
        />
      </div>
    </div>
  )
}
