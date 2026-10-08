'use client'

import { useState } from 'react'
import { createMedium } from './actions'
import { ART } from '@/lib/content'

export default function NewMediumForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        {ART.newMediumButton}
      </button>
    )
  }

  return (
    <form action={createMedium} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input name="name" placeholder={ART.newMediumPlaceholder} required autoFocus style={{ width: 200 }} />
      <button type="submit" style={{ fontWeight: 'bold' }}>{ART.createLabel}</button>
      <button type="button" onClick={() => setOpen(false)}>✕</button>
    </form>
  )
}
