-- ============================================================
-- q — private life app
-- Run in the Supabase SQL editor after 001 and 002.
-- Every q_ table is admin-only (read and write).
-- ============================================================

-- ── drop old trackers ───────────────────────────────────────
drop table if exists tracker_entries;
drop table if exists trackers;

-- ── helper: is the current user the admin? ──────────────────
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- Applies the standard admin-only policy to a q_ table.
create or replace function q_lock(tbl text)
returns void language plpgsql as $$
begin
  execute format('alter table %I enable row level security', tbl);
  execute format('drop policy if exists "admin only" on %I', tbl);
  execute format(
    'create policy "admin only" on %I for all using (is_admin()) with check (is_admin())', tbl);
end;
$$;

-- ============================================================
-- state — small key/value bookkeeping (e.g. last close-out date)
-- ============================================================
create table if not exists q_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
select q_lock('q_state');

-- ============================================================
-- themes — yearly theme, quarterly sub-theme
-- ============================================================
create table if not exists q_themes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('year', 'quarter')),
  period_start date not null,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (scope, period_start)
);
select q_lock('q_themes');

-- ============================================================
-- routines — anything that repeats
-- ============================================================
create table if not exists q_routines (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  cadence text not null check (cadence in ('daily','weekly','monthly','quarterly','yearly','interval')),
  interval_days int check (interval_days is null or interval_days > 0),
  value int not null default 10,
  miss_penalty int,              -- null = half of value
  starts_on date not null default ((now() at time zone 'America/Chicago')::date),
  active boolean not null default true,
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
select q_lock('q_routines');

-- One row per routine per period. period_start = the day / monday /
-- 1st of month / 1st of quarter / jan 1 (or interval anchor).
create table if not exists q_routine_checks (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references q_routines(id) on delete cascade,
  period_start date not null,
  status text not null check (status in ('done','late','missed')),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (routine_id, period_start)
);
select q_lock('q_routine_checks');

-- ============================================================
-- projects + one-off tasks
-- ============================================================
create table if not exists q_projects (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  status text not null default 'idea' check (status in ('idea','active','paused','done','dropped')),
  notes text,
  start_date date,
  target_date date,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_projects');

create table if not exists q_tasks (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  notes text,
  value int not null default 25,
  due_date date,
  project_id uuid references q_projects(id) on delete set null,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_tasks');

-- ============================================================
-- logs — runs, lifts, books, films...
-- ============================================================
create table if not exists q_log_types (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  name text not null,
  unit text,                     -- 'mi', 'min', 'lbs' … null = no amount
  value int not null default 0,
  icon text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_log_types');

create table if not exists q_logs (
  id uuid primary key default gen_random_uuid(),
  log_type_id uuid not null references q_log_types(id) on delete cascade,
  logged_on date not null default current_date,
  amount numeric,
  note text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
select q_lock('q_logs');

-- ============================================================
-- crew
-- ============================================================
create table if not exists q_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  circle text not null default 'friend' check (circle in ('partner','family','friend','other')),
  contact_every_days int,
  birthday date,
  notes text,
  created_at timestamptz not null default now()
);
select q_lock('q_people');

create table if not exists q_interactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('call','visit','one_on_one','group','letter','date','gift','kindness','other')),
  happened_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
select q_lock('q_interactions');

create table if not exists q_interaction_people (
  interaction_id uuid not null references q_interactions(id) on delete cascade,
  person_id uuid not null references q_people(id) on delete cascade,
  primary key (interaction_id, person_id)
);
select q_lock('q_interaction_people');

-- ============================================================
-- lists — follows, orgs, ideas, get-rid-of …
-- ============================================================
create table if not exists q_lists (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_lists');

create table if not exists q_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references q_lists(id) on delete cascade,
  title text not null,
  url text,
  notes text,
  status text not null default 'open' check (status in ('open','done','dropped')),
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_list_items');

-- ============================================================
-- missions — set during monthly / quarterly review
-- ============================================================
create table if not exists q_missions (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  notes text,
  period text not null check (period in ('month','quarter')),
  period_start date not null,
  theme_id uuid references q_themes(id) on delete set null,
  kind text not null check (kind in ('checklist','deadline','speed','streak','target','abstain')),
  reward int not null default 1000,
  -- strikes
  strike_formula text not null default 'halving' check (strike_formula in ('halving','linear','custom')),
  strike_linear_pct int,         -- linear: % of reward lost per strike
  strike_table int[],            -- custom: payout for 0,1,2… strikes
  strike_limit int not null default 3,
  -- timing
  started_at timestamptz,
  due_on date,                   -- deadline missions
  duration_days int,             -- streak / abstain length
  streak_cadence text check (streak_cadence in ('daily','weekly')),
  streak_per_period int not null default 1,
  speed_tiers jsonb,             -- [{ "days": 7, "reward": 1000 }, { "days": null, "reward": 400 }]
  -- target
  target_amount numeric,
  target_log_type_id uuid references q_log_types(id) on delete set null,
  -- outcome
  status text not null default 'planned' check (status in ('planned','active','passed','failed','abandoned')),
  completed_at timestamptz,
  payout int,
  created_at timestamptz not null default now()
);
select q_lock('q_missions');

create table if not exists q_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references q_missions(id) on delete cascade,
  title text not null,
  done_at timestamptz,
  sort_order int not null default 0
);
select q_lock('q_mission_steps');

create table if not exists q_mission_checks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references q_missions(id) on delete cascade,
  checked_on date not null default current_date,
  amount numeric,
  note text,
  created_at timestamptz not null default now()
);
select q_lock('q_mission_checks');

create table if not exists q_strikes (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references q_missions(id) on delete cascade,
  kind text not null check (kind in ('miss','late','slip')),
  period_start date,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists q_strikes_one_miss_per_period
  on q_strikes (mission_id, period_start) where kind = 'miss';
select q_lock('q_strikes');

-- ============================================================
-- qbucks
-- ============================================================
create table if not exists q_paydays (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,      -- monday of the week claimed
  gross int not null,
  deductions int not null,
  decay int not null default 0,
  net int not null,
  claimed_at timestamptz not null default now()
);
select q_lock('q_paydays');

create table if not exists q_ledger (
  id uuid primary key default gen_random_uuid(),
  amount int not null,
  status text not null default 'pending' check (status in ('pending','paid','void')),
  source text not null check (source in ('routine','task','log','mission','review','purchase','decay','manual')),
  source_id uuid,
  domain text check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  note text,
  occurred_on date not null default current_date,
  payday_id uuid references q_paydays(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists q_ledger_status on q_ledger (status, occurred_on);
create index if not exists q_ledger_source on q_ledger (source, source_id);
select q_lock('q_ledger');

-- Balance (paid) and pending totals. Runs as the caller, so RLS applies.
create or replace function q_balances()
returns table (balance bigint, pending bigint) language sql stable as $$
  select
    coalesce(sum(amount) filter (where status = 'paid'), 0),
    coalesce(sum(amount) filter (where status = 'pending'), 0)
  from q_ledger
$$;

create table if not exists q_reviews (
  id uuid primary key default gen_random_uuid(),
  cadence text not null check (cadence in ('weekly','monthly','quarterly','yearly')),
  period_start date not null,
  notes text,
  answers jsonb not null default '{}',
  completed_at timestamptz,
  payday_id uuid references q_paydays(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (cadence, period_start)
);
select q_lock('q_reviews');

-- ============================================================
-- reward shop (purchase wants live here too)
-- ============================================================
create table if not exists q_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'want' check (category in ('want','treat','experience','other')),
  domain text check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  cost int not null,
  repeatable boolean not null default false,
  cooldown_days int,
  url text,
  notes text,
  status text not null default 'available' check (status in ('available','bought','retired')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select q_lock('q_rewards');

create table if not exists q_purchases (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references q_rewards(id) on delete cascade,
  cost int not null,
  purchased_at timestamptz not null default now()
);
select q_lock('q_purchases');

-- ============================================================
-- writing — blog_posts doubles as journal / notes
-- `published` = shows on the public /blog
-- ============================================================
alter table blog_posts add column if not exists kind text not null default 'post'
  check (kind in ('post','journal','note'));
alter table blog_posts add column if not exists domain text
  check (domain in ('body','home','styl','crew','arts','city','make','admn'));
