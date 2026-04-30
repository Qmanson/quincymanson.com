'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { slugify } from '@/lib/slugify'
import { revalidatePath } from 'next/cache'

export async function createTracker(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const name = formData.get('name') as string
  const color = (formData.get('color') as string) || '#22c55e'
  const icon = (formData.get('icon') as string) || null

  await supabase.from('trackers').insert({
    name,
    slug: slugify(name),
    color,
    icon,
  })

  revalidatePath('/trackers')
}

export async function updateTracker(id: string, updates: { name?: string; color?: string; icon?: string | null }) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  await supabase.from('trackers').update({
    ...updates,
    ...(updates.name ? { slug: slugify(updates.name) } : {}),
  }).eq('id', id)
  revalidatePath('/trackers')
}

export async function deleteTracker(id: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('trackers').delete().eq('id', id)
  revalidatePath('/trackers')
}

export async function logEntry(formData: FormData) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()

  const tracker_id = formData.get('tracker_id') as string
  const date = formData.get('date') as string
  const note = (formData.get('note') as string) || null

  // Upsert boolean true for this entry
  await supabase.from('tracker_entries').upsert(
    { tracker_id, date, value: { bool: true }, note },
    { onConflict: 'tracker_id,date' }
  )

  revalidatePath('/trackers')
}

export async function deleteEntry(id: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('tracker_entries').delete().eq('id', id)
  revalidatePath('/trackers')
}

export async function upsertEntry(trackerId: string, date: string, note?: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('tracker_entries').upsert(
    { tracker_id: trackerId, date, value: { bool: true }, note: note ?? null },
    { onConflict: 'tracker_id,date' }
  )
  revalidatePath('/trackers')
}

export async function removeEntry(trackerId: string, date: string) {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase
    .from('tracker_entries')
    .delete()
    .eq('tracker_id', trackerId)
    .eq('date', date)
  revalidatePath('/trackers')
}
