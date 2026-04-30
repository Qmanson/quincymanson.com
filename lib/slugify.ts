import slugifyLib from 'slugify'
import { createClient } from '@/lib/supabase/server'

export function slugify(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, trim: true })
}

/**
 * Generate a unique slug for a table by checking for collisions
 * and appending -2, -3, etc. as needed.
 */
export async function uniqueSlug(
  table: 'blog_clusters' | 'blog_posts' | 'mediums',
  desiredText: string
): Promise<string> {
  const supabase = await createClient()
  const base = slugify(desiredText) || 'untitled'

  let candidate = base
  let n = 2
  // Limit iterations defensively
  while (n < 1000) {
    const { data } = await supabase
      .from(table)
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${n}`
    n++
  }
  return `${base}-${Date.now()}`
}
