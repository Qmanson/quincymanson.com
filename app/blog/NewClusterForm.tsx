'use client'

import { useState } from 'react'
import { createCluster } from './actions'
import { BLOG } from '@/lib/content'

export default function NewClusterForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        {BLOG.newClusterButton}
      </button>
    )
  }

  return (
    <form action={createCluster} className="window" style={{ marginTop: 8 }}>
      <div className="window-titlebar">
        <span>{BLOG.newClusterDialogTitle}</span>
      </div>
      <div className="window-body">
        <table style={{ width: '100%', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td className="label" style={{ padding: '4px 8px 4px 0', width: 90 }}>{BLOG.newClusterNameLabel}</td>
              <td><input name="name" required autoFocus style={{ width: '100%' }} /></td>
            </tr>
            <tr>
              <td className="label" style={{ padding: '4px 8px 4px 0' }}>{BLOG.newClusterDescLabel}</td>
              <td><input name="description" placeholder={BLOG.newClusterDescPlaceholder} style={{ width: '100%' }} /></td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={{ fontWeight: 'bold' }}>{BLOG.okLabel}</button>
          <button type="button" onClick={() => setOpen(false)}>{BLOG.cancelLabel}</button>
        </div>
      </div>
    </form>
  )
}
