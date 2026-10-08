import type { CSSProperties } from 'react'
import type { Json } from '@/lib/types'
import type { Crop } from './types'

export const NO_CROP: Crop = { x: 50, y: 50, z: 1 }

export function toCrop(j: Json | null | undefined): Crop {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return NO_CROP
  const o = j as Record<string, unknown>
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  return { x: n(o.x, 50), y: n(o.y, 50), z: Math.max(1, n(o.z, 1)) }
}

/** Style for an <img> filling its frame with object-fit: cover. */
export function cropStyle(c: Crop): CSSProperties {
  const origin = `${c.x}% ${c.y}%`
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: origin,
    transform: c.z !== 1 ? `scale(${c.z})` : undefined,
    transformOrigin: origin,
  }
}
