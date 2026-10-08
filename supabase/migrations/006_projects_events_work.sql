-- ============================================================
-- q — task urgency, event queue, picture framing, jobs & shifts
-- Run in the Supabase SQL editor after 005.
-- ============================================================

-- ── tasks: urgency (dated tasks get bucketed by how close they are) ──
alter table q_tasks add column if not exists urgency text not null default 'whenever';
alter table q_tasks drop constraint if exists q_tasks_urgency_check;
alter table q_tasks add constraint q_tasks_urgency_check check (urgency in ('whenever','soon','asap'));

-- ── events: a queue of things to go to / host ──────────────
create table if not exists q_events (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'crew' check (domain in ('body','home','styl','crew','arts','city','make','admn')),
  title text not null,
  happens_on date,               -- null = someday
  notes text,
  status text not null default 'planned' check (status in ('planned','done','skipped')),
  log_id uuid references q_logs(id) on delete set null,
  created_at timestamptz not null default now()
);
select q_lock('q_events');

create table if not exists q_event_people (
  event_id uuid not null references q_events(id) on delete cascade,
  person_id uuid not null references q_people(id) on delete cascade,
  primary key (event_id, person_id)
);
select q_lock('q_event_people');

-- ── picture framing: { x, y } focal point in %, z = zoom ────
alter table q_rewards add column if not exists image_crop jsonb;
alter table q_logs add column if not exists photo_crop jsonb;

-- ── work ────────────────────────────────────────────────────
create table if not exists q_jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wage numeric(10,2) not null default 0,     -- $ per hour
  q_per_hour int not null default 10,        -- Q$ earned per hour worked
  active boolean not null default true,
  created_at timestamptz not null default now()
);
select q_lock('q_jobs');

create table if not exists q_shifts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references q_jobs(id) on delete cascade,
  worked_on date not null,
  hours numeric(5,2),                        -- null until claimed
  location text,
  wage numeric(10,2),                        -- wage at the time, for history
  status text not null default 'done' check (status in ('planned','done')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists q_shifts_job on q_shifts (job_id, worked_on desc);
select q_lock('q_shifts');

alter table q_ledger drop constraint if exists q_ledger_source_check;
alter table q_ledger add constraint q_ledger_source_check
  check (source in ('routine','task','log','mission','review','purchase','decay','manual','shift','event'));
