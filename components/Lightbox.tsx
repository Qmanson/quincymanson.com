'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LikeButton from '@/components/LikeButton'
import type { Artwork, ArtworkFile } from '@/lib/types'

interface Props {
  artworks: Artwork[]
  index: number
  mediumSlug: string
  isAdmin: boolean
  onClose: () => void
  onIndexChange: (i: number) => void
}

const ZOOM_SCALE = 2.4

export default function Lightbox({
  artworks, index, mediumSlug, isAdmin, onClose, onIndexChange,
}: Props) {
  const artwork = artworks[index]
  const files = (artwork?.files ?? []) as ArtworkFile[]
  const [fileIdx, setFileIdx] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 50, y: 50 }) // percentage
  const imgWrapRef = useRef<HTMLDivElement>(null)

  // Reset to first file + un-zoom when artwork changes
  useEffect(() => {
    setFileIdx(0)
    setZoomed(false)
  }, [index])

  // Un-zoom when switching files
  useEffect(() => { setZoomed(false) }, [fileIdx])

  const next = useCallback(() => {
    if (index < artworks.length - 1) onIndexChange(index + 1)
  }, [index, artworks.length, onIndexChange])

  const prev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1)
  }, [index, onIndexChange])

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (zoomed) setZoomed(false)
        else onClose()
      }
      else if (e.key === 'ArrowRight') { setZoomed(false); next() }
      else if (e.key === 'ArrowLeft')  { setZoomed(false); prev() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, next, prev, zoomed])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!artwork) return null

  const file = files[fileIdx]
  const hasPrev = index > 0
  const hasNext = index < artworks.length - 1

  function onImageClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!file || file.type !== 'image') return
    if (zoomed) {
      setZoomed(false)
    } else {
      // Center zoom on click
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * 100
      const py = ((e.clientY - rect.top) / rect.height) * 100
      setPan({ x: px, y: py })
      setZoomed(true)
    }
  }

  function onImageMove(e: React.MouseEvent) {
    if (!zoomed) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    setPan({ x: px, y: py })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px',
          fontFamily: 'Courier New, monospace',
          color: '#fff',
          fontSize: 12,
        }}
      >
        <span style={{ letterSpacing: 1 }}>
          ★ {index + 1} / {artworks.length}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LikeButton artworkId={artwork.id} initialLikes={artwork.likes} size="md" stopPropagation />
          {isAdmin && (
            <Link
              href={`/art/${mediumSlug}/${artwork.id}`}
              onClick={onClose}
              style={{ color: '#9bd', textDecoration: 'underline', fontSize: 12 }}
            >
              edit ↗
            </Link>
          )}
          <button
            onClick={onClose}
            style={{
              fontFamily: 'Courier New, monospace',
              fontSize: 12,
              padding: '2px 10px',
              background: '#fff',
              color: '#000',
              border: '2px outset #ccc',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            ✕ ESC
          </button>
        </div>
      </div>

      {/* Main viewing area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '0 60px',
          minHeight: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Prev arrow */}
        <button
          onClick={prev}
          disabled={!hasPrev}
          aria-label="Previous"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44, height: 44,
            fontSize: 20,
            fontWeight: 'bold',
            background: hasPrev ? '#fff' : '#666',
            color: hasPrev ? '#000' : '#999',
            border: '3px outset #999',
            cursor: hasPrev ? 'pointer' : 'not-allowed',
            opacity: hasPrev ? 1 : 0.4,
            zIndex: 2,
          }}
        >
          ◀
        </button>

        {/* The media */}
        <div
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {file?.type === 'image' && (
            <div
              ref={imgWrapRef}
              onClick={onImageClick}
              onMouseMove={onImageMove}
              onMouseLeave={() => zoomed && setPan({ x: 50, y: 50 })}
              style={{
                position: 'relative',
                background: '#fff',
                padding: 6,
                border: '4px ridge #888',
                boxShadow: '0 0 24px rgba(0,0,0,0.6)',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
                overflow: 'hidden',
                maxWidth: '100%',
                maxHeight: '70vh',
                lineHeight: 0,
              }}
            >
              <Image
                src={file.url}
                alt={artwork.title}
                width={1600}
                height={1200}
                priority
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(70vh - 12px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  transform: zoomed ? `scale(${ZOOM_SCALE})` : 'scale(1)',
                  transformOrigin: `${pan.x}% ${pan.y}%`,
                  transition: zoomed ? 'transform 0ms' : 'transform 150ms ease-out',
                  pointerEvents: 'none',
                }}
              />
              {zoomed && (
                <span style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', color: '#fff',
                  fontFamily: 'Courier New, monospace', fontSize: 10,
                  padding: '2px 6px', pointerEvents: 'none',
                }}>
                  ◉ {ZOOM_SCALE}× — click to exit
                </span>
              )}
            </div>
          )}
          {file?.type === 'video' && (
            <video
              src={file.url}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                background: '#000',
                border: '4px ridge #888',
                boxShadow: '0 0 24px rgba(0,0,0,0.6)',
              }}
            />
          )}
          {file?.type === 'audio' && (
            <div style={{
              background: '#c0c0c0',
              border: '4px ridge #888',
              padding: 24,
              minWidth: 320,
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'Times New Roman, serif', fontSize: 22, margin: '0 0 12px', color: '#000' }}>
                ♪ {artwork.title}
              </p>
              <audio src={file.url} controls autoPlay style={{ width: '100%' }} />
            </div>
          )}
          {!file && (
            <div style={{
              background: '#c0c0c0',
              border: '4px ridge #888',
              padding: 32,
              fontFamily: 'Times New Roman, serif',
              color: '#000',
              fontSize: 20,
              textAlign: 'center',
              minWidth: 320,
            }}>
              {artwork.title}
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#666', marginTop: 8 }}>
                no files attached
              </p>
            </div>
          )}
        </div>

        {/* Next arrow */}
        <button
          onClick={next}
          disabled={!hasNext}
          aria-label="Next"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44, height: 44,
            fontSize: 20,
            fontWeight: 'bold',
            background: hasNext ? '#fff' : '#666',
            color: hasNext ? '#000' : '#999',
            border: '3px outset #999',
            cursor: hasNext ? 'pointer' : 'not-allowed',
            opacity: hasNext ? 1 : 0.4,
            zIndex: 2,
          }}
        >
          ▶
        </button>
      </div>

      {/* Bottom info window */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center' }}
      >
        <div
          className="window"
          style={{ maxWidth: 720, width: '100%' }}
        >
          <div className="window-titlebar">
            <span style={{ fontFamily: 'Courier New, monospace' }}>
              {artwork.title}{artwork.year ? ` (${artwork.year})` : ''}
            </span>
            <span style={{ fontFamily: 'Courier New, monospace', fontSize: 11 }}>
              {file?.type === 'image' ? 'click image to zoom · ' : ''}◀ ▶ ESC
            </span>
          </div>
          <div className="window-body" style={{ padding: '8px 14px' }}>
            {artwork.description && (
              <p style={{
                fontFamily: 'Times New Roman, serif',
                fontSize: 14,
                margin: 0,
                color: '#222',
                lineHeight: 1.5,
              }}>
                {artwork.description}
              </p>
            )}

            {/* Tags */}
            {artwork.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {artwork.tags.map(t => (
                  <Link
                    key={t}
                    href={`/art/${mediumSlug}?tag=${encodeURIComponent(t)}`}
                    onClick={onClose}
                    style={{
                      display: 'inline-block',
                      background: '#e0d8c0',
                      border: '1px solid #888',
                      padding: '0 6px',
                      fontSize: 11,
                      fontFamily: 'Courier New, monospace',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                    }}
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            {/* Multi-file thumb strip */}
            {files.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {files.map((f, i) => (
                  <button
                    key={f.url}
                    onClick={() => setFileIdx(i)}
                    style={{
                      width: 48, height: 48,
                      padding: 0,
                      background: '#fff',
                      border: i === fileIdx ? '3px ridge var(--accent)' : '3px ridge #888',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                    aria-label={`File ${i + 1}`}
                  >
                    {f.type === 'image' ? (
                      <Image src={f.url} alt="" fill style={{ objectFit: 'cover' }} sizes="48px" />
                    ) : (
                      <span style={{ fontFamily: 'Courier New, monospace', fontSize: 10 }}>{f.type}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!artwork.description && artwork.tags.length === 0 && files.length <= 1 && (
              <p style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#888', margin: 0, fontStyle: 'italic' }}>
                no description
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
