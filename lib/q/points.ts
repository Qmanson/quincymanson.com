import type { QMission, QRoutine, SpeedTier } from './types'

// ── tunables ────────────────────────────────────────────────

/** Unclaimed paydays lose this fraction per week past the grace week. */
export const DECAY_PER_WEEK = 0.1

/** Doing a missed routine after its period closed pays this share of value. */
export const LATE_SHARE = 0.5

/** Completing a review. */
export const REVIEW_BONUS = {
  weekly: 50,
  monthly: 200,
  quarterly: 500,
  yearly: 1000,
} as const

/** One-off task sizes. */
export const TASK_SIZES = { S: 25, M: 75, L: 200, XL: 500 } as const

// ── routines ────────────────────────────────────────────────

export function missPenalty(r: Pick<QRoutine, 'value' | 'miss_penalty'>): number {
  return r.miss_penalty ?? Math.ceil(r.value / 2)
}

export function lateValue(r: Pick<QRoutine, 'value'>): number {
  return Math.round(r.value * LATE_SHARE)
}

// ── missions ────────────────────────────────────────────────

/** What a mission's base reward is worth after `strikes` strikes. 0 = failed. */
export function applyStrikes(
  m: Pick<QMission, 'strike_formula' | 'strike_linear_pct' | 'strike_table' | 'strike_limit'>,
  base: number,
  strikes: number,
): number {
  if (strikes >= m.strike_limit) return 0
  switch (m.strike_formula) {
    case 'halving':
      return Math.round(base / 2 ** strikes)
    case 'linear':
      return Math.max(0, Math.round(base * (1 - ((m.strike_linear_pct ?? 25) * strikes) / 100)))
    case 'custom':
      return m.strike_table?.[strikes] ?? 0
  }
}

/** Speed missions: reward for finishing after `days`. null if no tier fits (too slow). */
export function speedReward(tiers: SpeedTier[], days: number): number | null {
  const sorted = [...tiers].sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity))
  for (const t of sorted) if (t.days === null || days <= t.days) return t.reward
  return null
}

export function formatQ(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}

/** Missions tied to the current yearly theme or quarterly sub-theme pay extra. */
export const THEME_BONUS = 1.25
