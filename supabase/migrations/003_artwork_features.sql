-- ════════════════════════════════════════════════════════════════
-- Adds likes + tags to artworks, and a public RPC for incrementing
-- likes that anyone (including anonymous visitors) can call.
--
-- Run this once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- Add columns (idempotent)
alter table public.artworks
  add column if not exists likes int not null default 0,
  add column if not exists tags  text[] not null default '{}';

-- Public-callable function to bump or decrement likes.
-- SECURITY DEFINER lets it bypass the admin-only UPDATE policy,
-- but it can only touch the likes column and only by ±1 per call.
create or replace function public.increment_artwork_likes(
  artwork_id uuid,
  delta int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  -- Clamp delta to {-1, 0, 1}
  if delta > 1 then delta := 1; end if;
  if delta < -1 then delta := -1; end if;

  update public.artworks
    set likes = greatest(0, likes + delta)
    where id = artwork_id
    returning likes into new_count;

  return new_count;
end;
$$;

-- Allow anon and signed-in users to call it
grant execute on function public.increment_artwork_likes(uuid, int) to anon, authenticated;
