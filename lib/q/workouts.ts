import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { LiftSet, QWorkout } from './types'
import { e1rm, liftPoints } from './lift'

type DB = SupabaseClient<Database>

export type Session = { day: string; sets: LiftSet[]; best: number | null; volume: number; q: number }
export type WorkoutStats = QWorkout & { sessions: Session[]; best: number | null; last: string | null }

/** Every workout with its sessions pulled out of lift logs (oldest first). */
export async function workoutStats(db: DB): Promise<WorkoutStats[]> {
  const [{ data: workouts }, { data: types }] = await Promise.all([
    db.from('q_workouts').select('*').order('name'),
    db.from('q_log_types').select('id').eq('kind', 'lift'),
  ])
  const typeIds = (types ?? []).map(t => t.id)
  const { data: logs } = typeIds.length
    ? await db.from('q_logs').select('logged_on, data').in('log_type_id', typeIds).order('logged_on').limit(2000)
    : { data: [] }

  return (workouts ?? []).map(w => {
    const byDay = new Map<string, LiftSet[]>()
    for (const l of logs ?? []) {
      const sets = ((l.data as { sets?: LiftSet[] } | null)?.sets ?? []).filter(s => s.workout === w.name)
      if (sets.length) byDay.set(l.logged_on, [...(byDay.get(l.logged_on) ?? []), ...sets])
    }
    const sessions = [...byDay.entries()].map(([day, sets]) => {
      const bests = sets.map(s => e1rm(s.weight, s.reps)).filter((x): x is number => x !== null)
      return {
        day,
        sets,
        best: bests.length ? Math.max(...bests) : null,
        volume: sets.reduce((v, s) => v + (s.sets ?? 1) * (s.reps ?? 0) * (s.weight ?? 0), 0),
        q: Math.round(sets.reduce((v, s) => v + liftPoints(s, w), 0)),
      }
    })
    const bests = sessions.map(s => s.best).filter((x): x is number => x !== null)
    return { ...w, sessions, best: bests.length ? Math.max(...bests) : null, last: sessions.at(-1)?.day ?? null }
  })
}
