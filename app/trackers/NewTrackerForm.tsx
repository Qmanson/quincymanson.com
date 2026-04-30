'use client'

import { useState } from 'react'
import { createTracker } from './actions'
import { TRACKERS } from '@/lib/content'

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

export default function NewTrackerForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        {TRACKERS.newTrackerButton}
      </button>
    )
  }

  return (
    <form action={createTracker} className="window" style={{ marginTop: 8, maxWidth: 360 }}>
      <div className="window-titlebar"><span>{TRACKERS.newTrackerDialogTitle}</span></div>
      <div className="window-body">
        <table style={{ width: '100%', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td className="label" style={{ padding: '4px 8px 4px 0', width: 70 }}>{TRACKERS.fieldName}</td>
              <td><input name="name" required autoFocus placeholder={TRACKERS.namePlaceholder} style={{ width: '100%' }} /></td>
            </tr>
            <tr>
              <td className="label" style={{ padding: '4px 8px 4px 0' }}>{TRACKERS.fieldIcon}</td>
              <td><input name="icon" placeholder={TRACKERS.iconPlaceholder} style={{ width: '100%' }} /></td>
            </tr>
          </tbody>
        </table>
        <p className="label" style={{ marginTop: 8, marginBottom: 4, fontSize: 11 }}>{TRACKERS.colorLabel}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {PRESET_COLORS.map((c, i) => (
            <label key={c} style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={i === 0}
                style={{ display: 'none' }}
              />
              <span style={{
                display: 'inline-block',
                width: 24, height: 24,
                background: c,
                border: '2px ridge var(--bevel-darker)',
              }} />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" style={{ fontWeight: 'bold' }}>{TRACKERS.okLabel}</button>
          <button type="button" onClick={() => setOpen(false)}>{TRACKERS.cancelLabel}</button>
        </div>
      </div>
    </form>
  )
}
