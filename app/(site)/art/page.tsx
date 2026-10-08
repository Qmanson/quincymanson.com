import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import NewMediumForm from './NewMediumForm'
import type { ArtworkFile } from '@/lib/types'
import { ART } from '@/lib/content'

export default async function ArtPage() {
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: mediums } = await supabase.from('mediums').select('*').order('sort_order')
  const { data: artworks } = await supabase.from('artworks').select('*').order('sort_order')

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>{ART.windowTitle}</span>
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
          {ART.pageHeading}
        </h1>
        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '10px 0 20px' }} />

        {(mediums ?? []).map(medium => {
          const mediumArtworks = (artworks ?? []).filter(a => a.medium_id === medium.id)

          return (
            <section key={medium.id} style={{ marginBottom: 28 }}>
              <Link href={`/art/${medium.slug}`} className="label" style={{ fontWeight: 'bold', fontSize: 15, color: 'var(--ink)' }}>
                ▸ {medium.name.toUpperCase()} ({mediumArtworks.length})
              </Link>

              {mediumArtworks.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 8 }}>
                  {mediumArtworks.slice(0, 8).map(artwork => {
                    const firstFile = (artwork.files as unknown as ArtworkFile[])?.[0]
                    return (
                      <Link key={artwork.id} href={`/art/${medium.slug}/${artwork.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          aspectRatio: '1',
                          background: '#fff',
                          border: '4px ridge var(--bevel-darker)',
                          padding: 2,
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          {firstFile?.type === 'image' ? (
                            <Image src={firstFile.url} alt={artwork.title} fill style={{ objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontFamily: 'Courier New, monospace', fontSize: 11, padding: 4, textAlign: 'center', color: '#444',
                            }}>{artwork.title}</div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p style={{ paddingLeft: 16, fontStyle: 'italic', color: '#777', fontSize: 14, marginTop: 4 }}>{ART.emptyMediumShort}</p>
              )}
            </section>
          )
        })}

        {(mediums ?? []).length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#777' }}>{ART.emptyMediums}</p>
        )}

        {admin && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px dashed #888' }}>
            <NewMediumForm />
          </div>
        )}
      </div>
    </div>
  )
}
