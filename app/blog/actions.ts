'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { slugify, uniqueSlug } from '@/lib/slugify'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Clusters ──────────────────────────────────────────────

export async function createCluster(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const slug = await uniqueSlug('blog_clusters', name)

  const { data, error } = await supabase
    .from('blog_clusters')
    .insert({ name, slug, description: description || null })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/blog')
  redirect(`/blog/${data.slug}`)
}

export async function updateCluster(id: string, updates: { name?: string; description?: string }) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  await supabase.from('blog_clusters').update({
    ...updates,
    ...(updates.name ? { slug: slugify(updates.name) } : {}),
  }).eq('id', id)
  revalidatePath('/blog')
}

export async function deleteCluster(id: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('blog_clusters').delete().eq('id', id)
  revalidatePath('/blog')
  redirect('/blog')
}

// ── Posts ─────────────────────────────────────────────────

export async function createPost(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const title = formData.get('title') as string
  const cluster_id = formData.get('cluster_id') as string | null
  const customSlug = formData.get('slug') as string | null
  const slug = customSlug ? slugify(customSlug) : await uniqueSlug('blog_posts', title)

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug,
      cluster_id: cluster_id || null,
      body_md: '',
      published: false,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/blog')

  // Find cluster slug for redirect
  if (cluster_id) {
    const { data: cluster } = await supabase
      .from('blog_clusters')
      .select('slug')
      .eq('id', cluster_id)
      .single()
    if (cluster) redirect(`/blog/${cluster.slug}/${data.slug}`)
  }
  redirect(`/blog/uncategorized/${data.slug}`)
}

export async function updatePostBody(id: string, body_md: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('blog_posts').update({ body_md }).eq('id', id)
  revalidatePath('/blog')
}

export async function updatePostMeta(
  id: string,
  updates: {
    title?: string
    cover_url?: string | null
    tags?: string[]
    cluster_id?: string | null
    slug?: string
  }
) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('blog_posts').update({
    ...updates,
    ...(updates.title ? { slug: slugify(updates.title) } : {}),
  }).eq('id', id)
  revalidatePath('/blog')
}

export async function updatePostField(
  id: string,
  field: 'title' | 'body_md' | 'cover_url' | 'tags' | 'cluster_id' | 'slug',
  value: string | string[] | null
) {
  if (field === 'body_md') return updatePostBody(id, value as string)
  return updatePostMeta(id, { [field]: value } as Parameters<typeof updatePostMeta>[1])
}

export async function togglePublished(id: string, published: boolean) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  await supabase.from('blog_posts').update({
    published,
    published_at: published ? new Date().toISOString() : null,
  }).eq('id', id)

  revalidatePath('/blog')
}

export async function deletePost(id: string, redirectTo: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('blog_posts').delete().eq('id', id)
  revalidatePath('/blog')
  redirect(redirectTo)
}
