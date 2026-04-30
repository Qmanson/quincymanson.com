-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- blog_clusters
-- ============================================================
create table if not exists blog_clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table blog_clusters enable row level security;

create policy "Public can read clusters"
  on blog_clusters for select using (true);

create policy "Admin can insert clusters"
  on blog_clusters for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update clusters"
  on blog_clusters for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete clusters"
  on blog_clusters for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- blog_posts
-- ============================================================
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references blog_clusters(id) on delete set null,
  title text not null,
  slug text unique not null,
  body_md text not null default '',
  cover_url text,
  tags text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table blog_posts enable row level security;

create policy "Public can read published posts"
  on blog_posts for select
  using (published = true or (select is_admin from profiles where id = auth.uid()));

create policy "Admin can insert posts"
  on blog_posts for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update posts"
  on blog_posts for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete posts"
  on blog_posts for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute procedure update_updated_at();

-- ============================================================
-- mediums
-- ============================================================
create table if not exists mediums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table mediums enable row level security;

create policy "Public can read mediums"
  on mediums for select using (true);

create policy "Admin can insert mediums"
  on mediums for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update mediums"
  on mediums for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete mediums"
  on mediums for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- artworks
-- ============================================================
create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  medium_id uuid references mediums(id) on delete set null,
  title text not null,
  year int,
  description text,
  files jsonb not null default '[]',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table artworks enable row level security;

create policy "Public can read artworks"
  on artworks for select using (true);

create policy "Admin can insert artworks"
  on artworks for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update artworks"
  on artworks for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete artworks"
  on artworks for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- trackers
-- ============================================================
create table if not exists trackers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  color text not null default '#22c55e',
  icon text,
  value_type text not null default 'boolean' check (value_type in ('boolean', 'numeric', 'text')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table trackers enable row level security;

create policy "Public can read trackers"
  on trackers for select using (true);

create policy "Admin can insert trackers"
  on trackers for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update trackers"
  on trackers for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete trackers"
  on trackers for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- tracker_entries
-- ============================================================
create table if not exists tracker_entries (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  date date not null,
  value jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  unique (tracker_id, date)
);

alter table tracker_entries enable row level security;

create policy "Public can read tracker entries"
  on tracker_entries for select using (true);

create policy "Admin can insert tracker entries"
  on tracker_entries for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update tracker entries"
  on tracker_entries for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete tracker entries"
  on tracker_entries for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- links
-- ============================================================
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text not null,
  description text,
  tags text[] not null default '{}',
  found_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table links enable row level security;

create policy "Public can read links"
  on links for select using (true);

create policy "Admin can insert links"
  on links for insert
  with check ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can update links"
  on links for update
  using ((select is_admin from profiles where id = auth.uid()));

create policy "Admin can delete links"
  on links for delete
  using ((select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- Storage buckets (run in Supabase dashboard or via API)
-- CREATE BUCKET: artwork-files (public)
-- CREATE BUCKET: blog-covers (public)
-- ============================================================
