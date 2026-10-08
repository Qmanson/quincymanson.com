'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { slugify, uniqueSlug } from '@/lib/slugify'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ArtworkFile } from '@/lib/types'

// ── Mediums ───────────────────────────────────────────────

export async function createMedium(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const name = formData.get('name') as string
  const slug = await uniqueSlug('mediums', name)
  const { data, error } = await supabase
    .from('mediums')
    .insert({ name, slug })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/art')
  redirect(`/art/${data.slug}`)
}

export async function updateMedium(id: string, name: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('mediums').update({ name, slug: slugify(name) }).eq('id', id)
  revalidatePath('/art')
}

export async function deleteMedium(id: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('mediums').delete().eq('id', id)
  revalidatePath('/art')
  redirect('/art')
}

// ── Artworks ──────────────────────────────────────────────

export async function createArtwork(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const title = formData.get('title') as string
  const medium_id = (formData.get('medium_id') as string) || null
  const year = formData.get('year') ? parseInt(formData.get('year') as string) : null
  const description = (formData.get('description') as string) || null

  const { data, error } = await supabase
    .from('artworks')
    .insert({ title, medium_id, year, description })
    .select()
    .single()

  if (error) throw new Error(`Failed to create artwork: ${error.message}`)

  // Determine medium slug for redirect
  let mediumSlug: string | null = null
  if (medium_id) {
    const { data: medium } = await supabase
      .from('mediums')
      .select('slug')
      .eq('id', medium_id)
      .single()
    mediumSlug = medium?.slug ?? null
  }

  // Revalidate the gallery + the specific medium page so the new artwork shows
  revalidatePath('/art')
  if (mediumSlug) revalidatePath(`/art/${mediumSlug}`)

  if (mediumSlug) {
    redirect(`/art/${mediumSlug}/${data.id}`)
  }
  redirect('/art')
}

/**
 * Batch-create artworks: one per file uploaded.
 * Title defaults to the filename (without extension).
 * Used by the bulk-upload UI on the medium page.
 */
export async function batchCreateArtworks(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const medium_id = (formData.get('medium_id') as string) || null
  const files = formData.getAll('files') as File[]

  if (!files.length) throw new Error('No files provided')

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue

    // Upload to storage
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('artwork-files')
      .upload(path, file, { contentType: file.type })
    if (uploadErr) throw new Error(`Upload failed for ${file.name}: ${uploadErr.message}`)

    const { data: { publicUrl } } = supabase.storage.from('artwork-files').getPublicUrl(path)

    // File type
    const type: ArtworkFile['type'] = file.type.startsWith('video') ? 'video'
      : file.type.startsWith('audio') ? 'audio' : 'image'

    // Title from filename minus extension
    const title = file.name.replace(/\.[^/.]+$/, '') || 'Untitled'

    const { error: insertErr } = await supabase.from('artworks').insert({
      title,
      medium_id,
      files: [{ url: publicUrl, type, caption: file.name }] as unknown as ArtworkFile[],
    })
    if (insertErr) throw new Error(`Insert failed for ${file.name}: ${insertErr.message}`)
  }

  // Revalidate
  revalidatePath('/art')
  if (medium_id) {
    const { data: medium } = await supabase.from('mediums').select('slug').eq('id', medium_id).single()
    if (medium) revalidatePath(`/art/${medium.slug}`)
  }
}

export async function updateArtwork(
  id: string,
  updates: {
    title?: string
    year?: number | null
    description?: string | null
    medium_id?: string | null
    tags?: string[]
  }
) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('artworks').update(updates).eq('id', id)
  revalidatePath('/art')
}

export async function addArtworkFile(id: string, file: ArtworkFile) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const { data } = await supabase
    .from('artworks')
    .select('files')
    .eq('id', id)
    .single()

  const files = ((data?.files as ArtworkFile[]) ?? []).concat(file)
  await supabase.from('artworks').update({ files }).eq('id', id)
  revalidatePath('/art')
}

export async function removeArtworkFile(id: string, url: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const { data } = await supabase.from('artworks').select('files').eq('id', id).single()
  const files = ((data?.files as ArtworkFile[]) ?? []).filter(f => f.url !== url)
  await supabase.from('artworks').update({ files }).eq('id', id)

  // Delete the orphaned blob from Storage
  const match = url.match(/\/storage\/v1\/object\/public\/artwork-files\/(.+)$/)
  if (match) {
    const path = decodeURIComponent(match[1])
    await supabase.storage.from('artwork-files').remove([path])
  }

  revalidatePath('/art')
}

export async function deleteArtwork(id: string, redirectTo: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  // Fetch attached files first so we can purge them from Storage
  const { data: artwork } = await supabase
    .from('artworks')
    .select('files')
    .eq('id', id)
    .single()

  const files = (artwork?.files as ArtworkFile[] | null) ?? []

  // Extract bucket paths from each public URL.
  // Format: https://<host>/storage/v1/object/public/artwork-files/<path>
  const paths = files
    .map(f => {
      const match = f.url.match(/\/storage\/v1\/object\/public\/artwork-files\/(.+)$/)
      return match ? decodeURIComponent(match[1]) : null
    })
    .filter((p): p is string => !!p)

  if (paths.length > 0) {
    // Best-effort delete; don't block the row deletion if storage fails
    await supabase.storage.from('artwork-files').remove(paths)
  }

  await supabase.from('artworks').delete().eq('id', id)
  revalidatePath('/art')
  redirect(redirectTo)
}

export async function uploadArtworkFile(formData: FormData): Promise<string> {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const file = formData.get('file') as File
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('artwork-files')
    .upload(path, file, { contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('artwork-files').getPublicUrl(path)
  return data.publicUrl
}
