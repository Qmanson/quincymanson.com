import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { LiftSet, LogKind, MediaKind, QLog, QLogType } from './types'
import { signPaths } from './media'

type DB = SupabaseClient<Database>

/** A log ready to render — everything joined and formatted. */
export type LogView = {
  id: string
  logged_on: string
  type: string
  kind: LogKind
  title: string
  detail: string | null
  note: string | null
  rating: number | null
  tags: string[]
  cover: string | null
  mediaKind: MediaKind | null
  photo: string | null
  people: string[]
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}

function data<T>(log: QLog): Partial<T> {
  return log.data && typeof log.data === 'object' && !Array.isArray(log.data) ? (log.data as Partial<T>) : {}
}

export async function viewLogs(db: DB, logs: QLog[], types: QLogType[]): Promise<LogView[]> {
  if (!logs.length) return []
  const typeById = new Map(types.map(t => [t.id, t]))
  const ids = logs.map(l => l.id)
  const mediaIds = [...new Set(logs.map(l => l.media_id).filter((x): x is string => !!x))]

  const [{ data: media }, { data: links }, photos] = await Promise.all([
    mediaIds.length ? db.from('q_media').select('*').in('id', mediaIds) : Promise.resolve({ data: [] }),
    db.from('q_log_people').select('log_id, person_id').in('log_id', ids),
    signPaths(db, logs.map(l => l.photo_path)),
  ])
  const personIds = [...new Set((links ?? []).map(l => l.person_id))]
  const { data: people } = personIds.length
    ? await db.from('q_people').select('id, name').in('id', personIds)
    : { data: [] as { id: string; name: string }[] }

  const mediaById = new Map((media ?? []).map(m => [m.id, m]))
  const nameById = new Map((people ?? []).map(p => [p.id, p.name]))

  return logs.map(l => {
    const t = typeById.get(l.log_type_id)
    const kind = t?.kind ?? 'basic'
    const m = l.media_id ? mediaById.get(l.media_id) : undefined
    let title = t?.name ?? 'log'
    let detail: string | null = null

    switch (kind) {
      case 'basic':
        if (l.amount !== null) detail = `${l.amount}${t?.unit ? ` ${t.unit}` : ''}`
        break
      case 'run': {
        const sec = data<{ seconds: number | null }>(l).seconds ?? null
        const parts = [`${l.amount ?? '?'} ${t?.unit ?? 'mi'}`]
        if (sec) {
          parts.push(formatDuration(sec))
          if (l.amount) parts.push(`${formatDuration(sec / Number(l.amount))}/${t?.unit ?? 'mi'}`)
        }
        detail = parts.join(' · ')
        break
      }
      case 'lift': {
        const sets = data<{ sets: LiftSet[] }>(l).sets ?? []
        detail = sets
          .map(s => `${s.workout}${s.sets && s.reps ? ` ${s.sets}×${s.reps}` : ''}${s.weight ? ` @ ${s.weight}` : ''}`)
          .join(' · ')
        break
      }
      case 'substance':
        detail = (data<{ substances: string[] }>(l).substances ?? []).join(', ')
        break
      case 'movie':
      case 'book':
      case 'album':
        if (m) {
          title = m.title
          detail = [m.creator, m.year].filter(Boolean).join(' · ')
        }
        break
      case 'event':
        title = data<{ title: string | null }>(l).title || 'event'
        break
      case 'photo':
        break
    }

    return {
      id: l.id,
      logged_on: l.logged_on,
      type: t?.name ?? '',
      kind,
      title,
      detail,
      note: l.note,
      rating: l.rating === null ? null : Number(l.rating),
      tags: l.tags ?? [],
      cover: m?.cover_url ?? null,
      mediaKind: m?.kind ?? null,
      photo: l.photo_path ? photos.get(l.photo_path) ?? null : null,
      people: (links ?? []).filter(x => x.log_id === l.id).map(x => nameById.get(x.person_id) ?? '?'),
    }
  })
}
