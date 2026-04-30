'use client'

import { useState } from 'react'
import { logEntry } from './actions'
import type { Tracker } from '@/lib/types'
import { TRACKERS } from '@/lib/content'

export default function LogEntryForm({ trackers }: { trackers: Tracker[] }) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        {TRACKERS.quickLogButton}
      </button>
    )
  }

  return (
    <form
      action={async (fd) => { await logEntry(fd); setOpen(false) }}
      style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <select name="tracker_id" required>
        <option value="">{TRACKERS.trackerSelectPlaceholder}</option>
        {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input name="date" type="date" defaultValue={today} required />
      <input name="note" placeholder={TRACKERS.notePlaceholder} style={{ width: 140 }} />
      <button type="submit" style={{ fontWeight: 'bold' }}>{TRACKERS.logLabel}</button>
      <button type="button" onClick={() => setOpen(false)}>✕</button>
    </form>
  )
}
