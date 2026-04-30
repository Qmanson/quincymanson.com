'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from '@/components/Lightbox'
import LikeButton from '@/components/LikeButton'
import type { Artwork, ArtworkFile } from '@/lib/types'

interface Props {
  artworks: Artwork[]
  mediumSlug: string
  isAdmin: boolean
}

export default function MediumGallery({ artworks, mediumSlug, isAdmin }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {artworks.map((artwork, i) => {
          const firstFile = (artwork.files as ArtworkFile[])?.[0]
          return (
            <div key={artwork.id}>
              {/* Clickable card area — div, NOT button, so we can put a button (the heart) below */}
              <div
                onClick={() => setOpenIdx(i)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenIdx(i) } }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${artwork.title}`}
                style={{ cursor: 'pointer', color: 'var(--ink)' }}
              >
                <div
                  style={{
                    aspectRatio: '1',
                    background: '#fff',
                    border: '4px ridge var(--bevel-darker)',
                    padding: 2,
                    position: 'relative',
                    marginBottom: 4,
                    overflow: 'hidden',
                    transition: 'border-color 100ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bevel-darker)' }}
                >
                  {firstFile?.type === 'image' ? (
                    <Image
                      src={firstFile.url}
                      alt={artwork.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : firstFile?.type === 'video' ? (
                    <div style={{
                      width: '100%', height: '100%', background: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontFamily: 'Courier New, monospace', fontSize: 11,
                    }}>
                      ▶ video
                    </div>
                  ) : firstFile?.type === 'audio' ? (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Courier New, monospace', fontSize: 18,
                    }}>
                      ♪
                    </div>
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontFamily: 'Courier New, monospace',
                      fontSize: 12, padding: 8, textAlign: 'center', color: '#444',
                    }}>{artwork.title}</div>
                  )}
                </div>
                <p style={{ fontSize: 14, margin: 0, lineHeight: 1.3 }}>
                  <span style={{ color: 'var(--accent)', marginRight: 4 }}>▪</span>
                  {artwork.title}
                  {artwork.year && (
                    <span style={{ color: '#666', fontFamily: 'Courier New, monospace', fontSize: 11, marginLeft: 6 }}>
                      ({artwork.year})
                    </span>
                  )}
                </p>
              </div>

              {/* Heart sits OUTSIDE the click target — sibling, not descendant */}
              <div style={{ marginTop: 4 }}>
                <LikeButton artworkId={artwork.id} initialLikes={artwork.likes} size="sm" />
              </div>
            </div>
          )
        })}
      </div>

      {openIdx !== null && (
        <Lightbox
          artworks={artworks}
          index={openIdx}
          mediumSlug={mediumSlug}
          isAdmin={isAdmin}
          onClose={() => setOpenIdx(null)}
          onIndexChange={setOpenIdx}
        />
      )}
    </>
  )
}
