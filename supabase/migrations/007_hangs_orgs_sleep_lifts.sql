-- ============================================================
-- q — hangs vs events, organizations, people/org files,
--     sleep log, per-unit Q$, lift scoring + maxes
-- Run in the Supabase SQL editor after 006.
-- ============================================================

-- ── organizations ───────────────────────────────────────────
create table if not exists q_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  notes text,                    -- the org's file; new notes append to the bottom
  created_at timestamptz not null default now()
);
select q_lock('q_orgs');

-- ── hangs (crew) and events (city, tied to an org) share q_events ──
alter table q_events add column if not exists kind text not null default 'event';
alter table q_events drop constraint if exists q_events_kind_check;
alter table q_events add constraint q_events_kind_check check (kind in ('hang','event'));
alter table q_events add column if not exists org_id uuid references q_orgs(id) on delete set null;
alter table q_events add column if not exists tags text[] not null default '{}';
alter table q_events add column if not exists done_at timestamptz;

-- what you noted about each person at that hang / event
alter table q_event_people add column if not exists note text;

update q_events set kind = 'hang' where domain = 'crew';

-- move hangs/events logged through the old "event" log type into q_events
do $$
declare
  l record;
  new_id uuid;
begin
  for l in
    select q_logs.*, q_log_types.domain as d
    from q_logs join q_log_types on q_log_types.id = q_logs.log_type_id
    where q_log_types.kind = 'event'
  loop
    insert into q_events (kind, domain, title, happens_on, notes, status, tags, done_at)
    values (
      case when l.d = 'crew' or l.d = 'city' then 'hang' else 'event' end,
      case when l.d = 'city' then 'crew' else l.d end,
      coalesce(nullif(l.data->>'title', ''), 'hang'),
      l.logged_on, l.note, 'done', l.tags, l.created_at
    )
    returning id into new_id;

    insert into q_event_people (event_id, person_id)
    select new_id, person_id from q_log_people where log_id = l.id;

    update q_ledger set source = 'event', source_id = new_id
    where source = 'log' and source_id = l.id;

    update q_events set log_id = null where log_id = l.id;
    delete from q_logs where id = l.id;
  end loop;
end $$;

delete from q_log_types where kind = 'event';

-- ── log types: Q$ per unit (meditate: 1 Q$ per minute), sleep ──
alter table q_log_types add column if not exists value_per_unit numeric(8,2);
alter table q_log_types drop constraint if exists q_log_types_kind_check;
alter table q_log_types add constraint q_log_types_kind_check
  check (kind in ('basic','lift','run','substance','movie','book','album','event','photo','sleep'));

update q_log_types set value = 0, value_per_unit = 1, unit = 'min' where name = 'meditate';

insert into q_log_types (domain, name, kind, unit, value, sort_order)
select 'body', 'sleep', 'sleep', null, 0, 0
where not exists (select 1 from q_log_types where kind = 'sleep');
-- sleep: data = { bed: '23:40', wake: '07:15' }, amount = hours slept

-- ── lifting: Q$ per rep at your max, tracked maxes ──────────
alter table q_workouts add column if not exists value_per_rep numeric(6,2) not null default 1;
alter table q_workouts add column if not exists max_weight numeric(7,2);   -- your 1-rep max (set it yourself)
