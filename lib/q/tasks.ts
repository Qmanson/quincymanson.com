import type { QTask, Urgency } from './types'
import { daysBetween } from './time'

/** Dated tasks pick their own urgency from how close the date is. */
export const ASAP_DAYS = 2
export const SOON_DAYS = 14

export function urgencyOf(task: Pick<QTask, 'urgency' | 'due_date'>, t: string): Urgency {
  if (!task.due_date) return task.urgency
  const days = daysBetween(t, task.due_date)
  if (days <= ASAP_DAYS) return 'asap'
  if (days <= SOON_DAYS) return 'soon'
  return 'whenever'
}

const RANK: Record<Urgency, number> = { asap: 0, soon: 1, whenever: 2 }

/** asap → soon → whenever, then soonest date, then oldest. */
export function byUrgency(t: string) {
  return (a: QTask, b: QTask) =>
    RANK[urgencyOf(a, t)] - RANK[urgencyOf(b, t)] ||
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
    a.created_at.localeCompare(b.created_at)
}
