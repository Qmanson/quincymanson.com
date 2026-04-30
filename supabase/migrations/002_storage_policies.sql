-- ════════════════════════════════════════════════════════════════
-- Storage RLS policies for the artwork-files and blog-covers buckets
--
-- A "public" bucket only means READS are public via URL.
-- Uploads (INSERT into storage.objects) still require an RLS policy.
-- These policies let admin users upload, read, and delete in those buckets.
--
-- Run this once in the Supabase SQL editor after creating the buckets.
-- ════════════════════════════════════════════════════════════════

-- ── artwork-files ─────────────────────────────────────────────────

-- Anyone can read (so <img> tags work for the public)
drop policy if exists "artwork_files_public_read" on storage.objects;
create policy "artwork_files_public_read"
  on storage.objects for select
  using (bucket_id = 'artwork-files');

-- Admin can upload
drop policy if exists "artwork_files_admin_insert" on storage.objects;
create policy "artwork_files_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'artwork-files'
    and (select is_admin from public.profiles where id = auth.uid())
  );

-- Admin can update
drop policy if exists "artwork_files_admin_update" on storage.objects;
create policy "artwork_files_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'artwork-files'
    and (select is_admin from public.profiles where id = auth.uid())
  );

-- Admin can delete
drop policy if exists "artwork_files_admin_delete" on storage.objects;
create policy "artwork_files_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'artwork-files'
    and (select is_admin from public.profiles where id = auth.uid())
  );

-- ── blog-covers ───────────────────────────────────────────────────

drop policy if exists "blog_covers_public_read" on storage.objects;
create policy "blog_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-covers');

drop policy if exists "blog_covers_admin_insert" on storage.objects;
create policy "blog_covers_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'blog-covers'
    and (select is_admin from public.profiles where id = auth.uid())
  );

drop policy if exists "blog_covers_admin_update" on storage.objects;
create policy "blog_covers_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'blog-covers'
    and (select is_admin from public.profiles where id = auth.uid())
  );

drop policy if exists "blog_covers_admin_delete" on storage.objects;
create policy "blog_covers_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'blog-covers'
    and (select is_admin from public.profiles where id = auth.uid())
  );
