import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { searchMedia } from '@/lib/q/media'
import type { MediaKind } from '@/lib/q/types'

const KINDS: MediaKind[] = ['movie', 'book', 'album']

/** GET /q/api/media?kind=movie&q=heat — search films / books / albums. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const kind = req.nextUrl.searchParams.get('kind') as MediaKind
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!KINDS.includes(kind) || !q) return NextResponse.json({ results: [] })
  try {
    return NextResponse.json({ results: await searchMedia(kind, q) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'search failed' }, { status: 502 })
  }
}
