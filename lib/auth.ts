import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// cache(): layout + page + actions in one request share a single lookup.

export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** Verified JWT claims — checked locally when the project uses signing keys, so no auth round trip. */
const getClaims = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims ?? null
})

export const isAdmin = cache(async (): Promise<boolean> => {
  const claims = await getClaims()
  if (!claims?.sub) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', claims.sub)
    .single()

  return data?.is_admin === true
})
