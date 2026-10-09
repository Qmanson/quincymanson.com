import type { LiftSet, QWorkout } from './types'

/**
 * Q$ for one workout row: value_per_rep × sets × reps, scaled by how heavy
 * it was against your max (150 on a 200 max = 0.75×). Bodyweight or no max
 * set → counted at 1×. Capped at 1.25× so a typo can't print money.
 */
export function liftPoints(s: LiftSet, w: Pick<QWorkout, 'value_per_rep' | 'max_weight'> | undefined): number {
  const reps = (s.sets ?? 1) * (s.reps ?? 0)
  const perRep = Number(w?.value_per_rep ?? 1)
  const max = Number(w?.max_weight ?? 0)
  const intensity = s.weight && max ? Math.min(1.25, Number(s.weight) / max) : 1
  return reps * perRep * intensity
}

/** Estimated 1-rep max (Epley). */
export function e1rm(weight: number | null, reps: number | null): number | null {
  if (!weight || !reps) return null
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30))
}
