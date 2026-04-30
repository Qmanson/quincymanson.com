import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MediumHeader from './MediumHeader'
import MediumGallery from './MediumGallery'
import GalleryControls from './GalleryControls'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import BulkUploadForm from './BulkUploadForm'
import { deleteMedium, createArtwork } from '../actions'
import type { Artwork } from '@/lib/types'
import { ART } from '@/lib/content'

type SortKey = 'newest' | 'liked' | 'order'

export default async function MediumPage({
  params,
  searchParams,
}: {
  params: Promise<{ medium: string }>
  searchParams: Promise<{ sort?: string; tag?: string }>
}) {
  const { medium: mediumSlug } = await params
  const { sort: sortParam, tag } = await searchParams
  const sort: SortKey =
    sortParam === 'liked' || sortParam === 'order' ? sortParam : 'newest'

  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: medium } = await supabase.from('mediums').select('*').eq('slug', mediumSlug).single()
  if (!medium) notFound()

  // Build query with sort + optional tag filter
  let query = supabase.from('artworks').select('*').eq('medium_id', medium.id)
  if (tag) query = query.contains('tags', [tag])

  if (sort === 'liked') query = query.order('likes', { ascending: false }).order('created_at', { ascending: false })
  else if (sort === 'newest') query = query.order('created_at', { ascending: false })
  else query = query.order('sort_order').order('created_at', { ascending: false })

  const { data: artworks } = await query

  // For tag filter UI: collect every tag used across the medium (unfiltered)
  const { data: tagSource } = await supabase
    .from('artworks').select('tags').eq('medium_id', medium.id)
  const allTags = Array.from(
    new Set((tagSource ?? []).flatMap(a => a.tags))
  ).sort()

  const list = (artworks ?? []) as Artwork[]

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>🎨 art/{medium.slug}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <p style={{ marginBottom: 8 }}>
          <Link href="/art" style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>← back to gallery</Link>
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <MediumHeader medium={medium} isAdmin={admin} />
          {admin && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <form action={createArtwork} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="hidden" name="medium_id" value={medium.id} />
                <input name="title" placeholder={ART.newArtworkPlaceholder} required style={{ width: 160 }} />
                <button type="submit" style={{ fontWeight: 'bold' }}>{ART.newArtworkButton}</button>
              </form>
              <BulkUploadForm mediumId={medium.id} />
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '14px 0' }} />

        {/* Sort + tag filter */}
        {(list.length > 0 || allTags.length > 0) && (
          <GalleryControls currentSort={sort} currentTag={tag ?? null} allTags={allTags} />
        )}

        {list.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#777' }}>
            {tag ? `no artworks tagged "#${tag}"` : ART.emptyArtworks}
          </p>
        ) : (
          <MediumGallery
            artworks={list}
            mediumSlug={mediumSlug}
            isAdmin={admin}
          />
        )}

        {admin && (
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px dashed #888' }}>
            <ConfirmDeleteForm
              action={deleteMedium.bind(null, medium.id)}
              confirmMessage={ART.confirmDeleteMedium}
              label={ART.delMediumButton}
              style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
