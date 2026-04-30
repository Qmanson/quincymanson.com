'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'liked-artworks-v1'

function loadLiked(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveLiked(set: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

interface Props {
  artworkId: string
  initialLikes: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** If true, click events stop propagation (useful inside other clickable elements) */
  stopPropagation?: boolean
}

/**
 * Heart icon + count. Tracks per-browser via localStorage so the same
 * person can't spam likes. Optimistic UI + server-side counter via RPC.
 */
export default function LikeButton({
  artworkId,
  initialLikes,
  size = 'md',
  className,
  stopPropagation,
}: Props) {
  const [count, setCount] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  // Read localStorage on mount
  useEffect(() => {
    const set = loadLiked()
    setLiked(set.has(artworkId))
  }, [artworkId])

  // Keep in sync if parent re-renders with a fresh count from server
  useEffect(() => { setCount(initialLikes) }, [initialLikes])

  const onClick = useCallback(async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (busy) return
    setBusy(true)

    const next = !liked
    const delta = next ? 1 : -1

    // Optimistic UI
    setLiked(next)
    setCount(c => Math.max(0, c + delta))

    // Persist localStorage
    const set = loadLiked()
    if (next) set.add(artworkId)
    else set.delete(artworkId)
    saveLiked(set)

    // Hit the server
    const supabase = createClient()
    const { data, error } = await supabase.rpc('increment_artwork_likes', {
      artwork_id: artworkId,
      delta,
    })

    if (error) {
      // Rollback
      setLiked(!next)
      setCount(c => Math.max(0, c - delta))
      const rb = loadLiked()
      if (next) rb.delete(artworkId)
      else rb.add(artworkId)
      saveLiked(rb)
    } else if (typeof data === 'number') {
      // Trust the server's authoritative count
      setCount(data)
    }
    setBusy(false)
  }, [busy, liked, artworkId, stopPropagation])

  const dims = size === 'sm' ? { font: 11, heart: 12, gap: 3 }
            : size === 'lg' ? { font: 14, heart: 18, gap: 6 }
                            : { font: 12, heart: 14, gap: 4 }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        fontFamily: 'Courier New, monospace',
        fontSize: dims.font,
        padding: '1px 8px',
        background: liked ? '#ffe0e0' : undefined,
        cursor: busy ? 'wait' : 'pointer',
      }}
    >
      <span
        style={{
          fontSize: dims.heart,
          color: liked ? '#c41e3a' : '#666',
          lineHeight: 1,
          transition: 'transform 100ms',
          display: 'inline-block',
          transform: liked ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        {liked ? '♥' : '♡'}
      </span>
      <span>{count}</span>
    </button>
  )
}
