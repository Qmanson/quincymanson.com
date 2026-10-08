import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'

/** Supabase client for q pages — bounces anyone who isn't the admin to login. */
export async function qPage() {
  if (!(await isAdmin())) redirect('/login?next=/q')
  return createClient()
}

/** Supabase client for q server actions. */
export async function qAction() {
  if (!(await isAdmin())) throw new Error('Unauthorized')
  return createClient()
}
