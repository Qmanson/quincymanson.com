-- ============================================================
-- q — richer logs, media lookups, people at events, photos
-- Run in the Supabase SQL editor after 003.
-- ============================================================

-- ── log type kinds drive which form you get ─────────────────
alter table q_log_types add column if not exists kind text not null default 'basic';
alter table q_log_types drop constraint if exists q_log_types_kind_check;
alter table q_log_types add constraint q_log_types_kind_check
  check (kind in ('basic','lift','run','substance','movie','book','album','event','photo'));

update q_log_types set kind = 'lift',      unit = null where name = 'lift';
update q_log_types set kind = 'run',       unit = 'mi' where name = 'run';
update q_log_types set kind = 'substance', unit = null where name = 'substances';
update q_log_types set kind = 'movie'                  where name = 'movie';
update q_log_types set kind = 'book', name = 'book'    where name in ('book', 'book finished');
update q_log_types set kind = 'album'                  where name = 'album';
update q_log_types set kind = 'event'                  where name = 'event';
update q_log_types set kind = 'photo'                  where name = 'fit pic';
update q_log_types set icon = null;
delete from q_log_types where name = 'walk';

-- ── films / books / albums picked from outside databases ────
create table if not exists q_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('movie','book','album')),
  source text not null,          -- 'tmdb' | 'openlibrary' | 'musicbrainz'
  source_id text not null,
  title text not null,
  creator text,                  -- director / author / artist
  year int,
  cover_url text,
  created_at timestamptz not null default now(),
  unique (kind, source, source_id)
);
select q_lock('q_media');

-- ── structured log fields ───────────────────────────────────
alter table q_logs add column if not exists media_id uuid references q_media(id) on delete set null;
alter table q_logs add column if not exists rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5));
alter table q_logs add column if not exists tags text[] not null default '{}';
alter table q_logs add column if not exists photo_path text;
-- lift: data.sets = [{ workout, sets, reps, weight }]
-- run:  amount = miles, data.seconds = time
-- substance: data.substances = ['weed', …]

-- who was there (events)
create table if not exists q_log_people (
  log_id uuid not null references q_logs(id) on delete cascade,
  person_id uuid not null references q_people(id) on delete cascade,
  primary key (log_id, person_id)
);
select q_lock('q_log_people');

-- lift dropdown: remembered workout names
create table if not exists q_workouts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
select q_lock('q_workouts');

-- ── shop pictures ───────────────────────────────────────────
alter table q_rewards add column if not exists image_path text;   -- uploaded to q-media
alter table q_rewards add column if not exists image_url text;    -- or a pasted link

-- ── private photo bucket (fit pics, shop images) ────────────
insert into storage.buckets (id, name, public)
values ('q-media', 'q-media', false)
on conflict (id) do nothing;

drop policy if exists "q_media_admin_all" on storage.objects;
create policy "q_media_admin_all"
  on storage.objects for all
  using (bucket_id = 'q-media' and public.is_admin())
  with check (bucket_id = 'q-media' and public.is_admin());
