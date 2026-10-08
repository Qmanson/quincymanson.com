import type { Json } from '@/lib/types'

// ════════════════════════════════════════════════════════════
// q — private app row types
// ════════════════════════════════════════════════════════════

export const DOMAINS = ['body', 'home', 'styl', 'crew', 'arts', 'city', 'make', 'admn'] as const
export type Domain = (typeof DOMAINS)[number]

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'interval'

// Builds a supabase table definition from a row type. Columns with DB
// defaults (Opt) and nullable columns are optional on insert.
type NullableKeys<R> = { [K in keyof R]-?: null extends R[K] ? K : never }[keyof R]
type Flatten<T> = { [K in keyof T]: T[K] } & {}
export type QTable<R extends Record<string, unknown>, Opt extends keyof R = never> = {
  Row: R
  Insert: Flatten<Omit<R, Opt | NullableKeys<R>> & Partial<Pick<R, Opt | NullableKeys<R>>>>
  Update: Partial<R>
  Relationships: []
}

export type QTheme = {
  id: string
  scope: 'year' | 'quarter'
  period_start: string
  title: string
  notes: string | null
  created_at: string
}

export type QRoutine = {
  id: string
  domain: Domain
  title: string
  cadence: Cadence
  interval_days: number | null
  value: number
  miss_penalty: number | null
  starts_on: string
  active: boolean
  sort_order: number
  notes: string | null
  created_at: string
}

export type QRoutineCheck = {
  id: string
  routine_id: string
  period_start: string
  status: 'done' | 'late' | 'missed'
  done_at: string | null
  created_at: string
}

export type QProject = {
  id: string
  domain: Domain
  title: string
  status: 'idea' | 'active' | 'paused' | 'done' | 'dropped'
  notes: string | null
  start_date: string | null
  target_date: string | null
  done_at: string | null
  sort_order: number
  created_at: string
}

export type QTask = {
  id: string
  domain: Domain
  title: string
  notes: string | null
  value: number
  due_date: string | null
  project_id: string | null
  done_at: string | null
  sort_order: number
  created_at: string
}

export const LOG_KINDS = ['basic', 'lift', 'run', 'substance', 'movie', 'book', 'album', 'event', 'photo'] as const
export type LogKind = (typeof LOG_KINDS)[number]
export type MediaKind = 'movie' | 'book' | 'album'

export const SUBSTANCES = ['weed', 'alcohol', 'nicotine', 'psychedelics', 'stimulants'] as const

export type QLogType = {
  id: string
  domain: Domain
  name: string
  kind: LogKind
  unit: string | null
  value: number
  icon: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export type QLog = {
  id: string
  log_type_id: string
  logged_on: string
  amount: number | null
  note: string | null
  data: Json
  media_id: string | null
  rating: number | null
  tags: string[]
  photo_path: string | null
  created_at: string
}

export type LiftSet = { workout: string; sets: number | null; reps: number | null; weight: number | null }

export type QMedia = {
  id: string
  kind: MediaKind
  source: string
  source_id: string
  title: string
  creator: string | null
  year: number | null
  cover_url: string | null
  created_at: string
}

export type QLogPerson = {
  log_id: string
  person_id: string
}

export type QWorkout = {
  id: string
  name: string
  created_at: string
}

export type QPerson = {
  id: string
  name: string
  circle: 'partner' | 'family' | 'friend' | 'other'
  contact_every_days: number | null
  birthday: string | null
  notes: string | null
  created_at: string
}

export type InteractionKind =
  | 'call' | 'visit' | 'one_on_one' | 'group' | 'letter' | 'date' | 'gift' | 'kindness' | 'other'

export type QInteraction = {
  id: string
  kind: InteractionKind
  happened_on: string
  note: string | null
  created_at: string
}

export type QInteractionPerson = {
  interaction_id: string
  person_id: string
}

export type QList = {
  id: string
  domain: Domain
  title: string
  sort_order: number
  created_at: string
}

export type QListItem = {
  id: string
  list_id: string
  title: string
  url: string | null
  notes: string | null
  status: 'open' | 'done' | 'dropped'
  done_at: string | null
  sort_order: number
  created_at: string
}

export type MissionKind = 'checklist' | 'deadline' | 'speed' | 'streak' | 'target' | 'abstain'
export type SpeedTier = { days: number | null; reward: number }

export type QMission = {
  id: string
  domain: Domain
  title: string
  notes: string | null
  period: 'month' | 'quarter'
  period_start: string
  theme_id: string | null
  kind: MissionKind
  reward: number
  strike_formula: 'halving' | 'linear' | 'custom'
  strike_linear_pct: number | null
  strike_table: number[] | null
  strike_limit: number
  started_at: string | null
  due_on: string | null
  duration_days: number | null
  streak_cadence: 'daily' | 'weekly' | null
  streak_per_period: number
  speed_tiers: Json | null
  target_amount: number | null
  target_log_type_id: string | null
  status: 'planned' | 'active' | 'passed' | 'failed' | 'abandoned'
  completed_at: string | null
  payout: number | null
  created_at: string
}

export type QMissionStep = {
  id: string
  mission_id: string
  title: string
  done_at: string | null
  sort_order: number
}

export type QMissionCheck = {
  id: string
  mission_id: string
  checked_on: string
  amount: number | null
  note: string | null
  created_at: string
}

export type QStrike = {
  id: string
  mission_id: string
  kind: 'miss' | 'late' | 'slip'
  period_start: string | null
  note: string | null
  created_at: string
}

export type QPayday = {
  id: string
  week_start: string
  gross: number
  deductions: number
  decay: number
  net: number
  claimed_at: string
}

export type LedgerSource =
  | 'routine' | 'task' | 'log' | 'mission' | 'review' | 'purchase' | 'decay' | 'manual'

export type QLedger = {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'void'
  source: LedgerSource
  source_id: string | null
  domain: Domain | null
  note: string | null
  occurred_on: string
  payday_id: string | null
  created_at: string
}

export type QReview = {
  id: string
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  period_start: string
  notes: string | null
  answers: Json
  completed_at: string | null
  payday_id: string | null
  created_at: string
}

export type QReward = {
  id: string
  title: string
  category: 'want' | 'treat' | 'experience' | 'other'
  domain: Domain | null
  cost: number
  repeatable: boolean
  cooldown_days: number | null
  url: string | null
  image_path: string | null
  image_url: string | null
  notes: string | null
  status: 'available' | 'bought' | 'retired'
  sort_order: number
  created_at: string
}

export type QPurchase = {
  id: string
  reward_id: string
  cost: number
  purchased_at: string
}

export type QState = {
  key: string
  value: string
  updated_at: string
}

export type QTables = {
  q_state: QTable<QState, 'updated_at'>
  q_themes: QTable<QTheme, 'id' | 'created_at'>
  q_routines: QTable<QRoutine, 'id' | 'value' | 'starts_on' | 'active' | 'sort_order' | 'created_at'>
  q_routine_checks: QTable<QRoutineCheck, 'id' | 'created_at'>
  q_projects: QTable<QProject, 'id' | 'status' | 'sort_order' | 'created_at'>
  q_tasks: QTable<QTask, 'id' | 'value' | 'sort_order' | 'created_at'>
  q_log_types: QTable<QLogType, 'id' | 'kind' | 'value' | 'active' | 'sort_order' | 'created_at'>
  q_logs: QTable<QLog, 'id' | 'logged_on' | 'data' | 'tags' | 'created_at'>
  q_media: QTable<QMedia, 'id' | 'created_at'>
  q_log_people: QTable<QLogPerson>
  q_workouts: QTable<QWorkout, 'id' | 'created_at'>
  q_people: QTable<QPerson, 'id' | 'circle' | 'created_at'>
  q_interactions: QTable<QInteraction, 'id' | 'happened_on' | 'created_at'>
  q_interaction_people: QTable<QInteractionPerson>
  q_lists: QTable<QList, 'id' | 'sort_order' | 'created_at'>
  q_list_items: QTable<QListItem, 'id' | 'status' | 'sort_order' | 'created_at'>
  q_missions: QTable<
    QMission,
    'id' | 'reward' | 'strike_formula' | 'strike_limit' | 'streak_per_period' | 'status' | 'created_at'
  >
  q_mission_steps: QTable<QMissionStep, 'id' | 'sort_order'>
  q_mission_checks: QTable<QMissionCheck, 'id' | 'checked_on' | 'created_at'>
  q_strikes: QTable<QStrike, 'id' | 'created_at'>
  q_paydays: QTable<QPayday, 'id' | 'decay' | 'claimed_at'>
  q_ledger: QTable<QLedger, 'id' | 'status' | 'occurred_on' | 'created_at'>
  q_reviews: QTable<QReview, 'id' | 'answers' | 'created_at'>
  q_rewards: QTable<
    QReward,
    'id' | 'category' | 'repeatable' | 'status' | 'sort_order' | 'created_at'
  >
  q_purchases: QTable<QPurchase, 'id' | 'purchased_at'>
}
