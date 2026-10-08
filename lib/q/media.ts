import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { MediaKind } from './types'

type DB = SupabaseClient<Database>

export const BUCKET = 'q-media'

/** A search hit, before it's saved as a q_media row. */
export type MediaHit = {
  kind: MediaKind
  source: string
  source_id: string
  title: string
  creator: string | null
  year: number | null
  cover_url: string | null
}

const UA = 'q/1.0 ( https://quincymanson.com )'

export function tmdbReady(): boolean {
  return !!process.env.TMDB_READ_TOKEN
}

async function tmdb(path: string) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`, accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`tmdb ${res.status}`)
  return res.json()
}

export async function searchMedia(kind: MediaKind, q: string): Promise<MediaHit[]> {
  const query = encodeURIComponent(q)

  if (kind === 'movie') {
    if (!tmdbReady()) throw new Error('add TMDB_READ_TOKEN to search films')
    const data = await tmdb(`/search/movie?query=${query}&include_adult=false`)
    return (data.results ?? []).slice(0, 10).map((m: { id: number; title: string; release_date?: string; poster_path?: string | null }) => ({
      kind,
      source: 'tmdb',
      source_id: String(m.id),
      title: m.title,
      creator: null, // director filled in on save
      year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
      cover_url: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
    }))
  }

  if (kind === 'book') {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=10&fields=key,title,author_name,first_publish_year,cover_i`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } },
    )
    if (!res.ok) throw new Error(`openlibrary ${res.status}`)
    const data = await res.json()
    return (data.docs ?? []).map((b: { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number }) => ({
      kind,
      source: 'openlibrary',
      source_id: b.key,
      title: b.title,
      creator: b.author_name?.[0] ?? null,
      year: b.first_publish_year ?? null,
      cover_url: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    }))
  }

  const res = await fetch(`https://musicbrainz.org/ws/2/release-group/?query=${query}&fmt=json&limit=10`, {
    headers: { 'User-Agent': UA, accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`musicbrainz ${res.status}`)
  const data = await res.json()
  return (data['release-groups'] ?? []).map((r: { id: string; title: string; 'first-release-date'?: string; 'artist-credit'?: { name: string }[] }) => ({
    kind,
    source: 'musicbrainz',
    source_id: r.id,
    title: r.title,
    creator: r['artist-credit']?.map(a => a.name).join(', ') ?? null,
    year: r['first-release-date'] ? Number(r['first-release-date'].slice(0, 4)) || null : null,
    cover_url: `https://coverartarchive.org/release-group/${r.id}/front-250`,
  }))
}

/** Save (or reuse) a picked hit. Returns the q_media id. */
export async function saveMedia(db: DB, hit: MediaHit): Promise<string> {
  let creator = hit.creator
  if (hit.source === 'tmdb' && !creator && tmdbReady()) {
    try {
      const credits = await tmdb(`/movie/${hit.source_id}/credits`)
      creator = (credits.crew ?? []).find((c: { job: string }) => c.job === 'Director')?.name ?? null
    } catch {
      // director is nice-to-have
    }
  }
  const { data, error } = await db
    .from('q_media')
    .upsert(
      {
        kind: hit.kind,
        source: hit.source,
        source_id: hit.source_id,
        title: hit.title,
        creator,
        year: hit.year,
        cover_url: hit.cover_url,
      },
      { onConflict: 'kind,source,source_id' },
    )
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Signed URLs for private photos, keyed by storage path. */
export async function signPaths(db: DB, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))]
  const out = new Map<string, string>()
  if (!unique.length) return out
  const { data } = await db.storage.from(BUCKET).createSignedUrls(unique, 60 * 60 * 6)
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl)
  return out
}
