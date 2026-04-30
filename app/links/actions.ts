'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createLink(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const url = formData.get('url') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const tags = (formData.get('tags') as string)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  await supabase.from('links').insert({ url, title, description, tags })
  revalidatePath('/links')
}

export async function updateLink(
  id: string,
  updates: { url?: string; title?: string; description?: string | null; tags?: string[] }
) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('links').update(updates).eq('id', id)
  revalidatePath('/links')
}

export async function deleteLink(id: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('links').delete().eq('id', id)
  revalidatePath('/links')
}
