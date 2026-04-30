'use client'

import { useState } from 'react'
import { createPost } from './actions'
import type { BlogCluster } from '@/lib/types'
import { BLOG } from '@/lib/content'

export default function NewPostQuickForm({ clusters }: { clusters: BlogCluster[] }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        {BLOG.newPostButton}
      </button>
    )
  }

  return (
    <form action={createPost} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input name="title" placeholder={BLOG.postTitlePlaceholder} required autoFocus style={{ width: 200 }} />
      <select name="cluster_id" defaultValue="">
        <option value="">{BLOG.noClusterOption}</option>
        {clusters.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button type="submit" style={{ fontWeight: 'bold' }}>{BLOG.createLabel}</button>
      <button type="button" onClick={() => setOpen(false)}>✕</button>
    </form>
  )
}
