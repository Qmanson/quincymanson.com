'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Tracker, TrackerEntry } from '@/lib/types'
import { upsertEntry, removeEntry } from '@/app/trackers/actions'
import { TRACKERS } from '@/lib/content'

interface Props {
  tracker: Tracker
  entries: TrackerEntry[]
  isAdmin: boolean
}

function buildGrid(): string[] {
  const today = new Date()
  const days: string[] = []
  const d = new Date(today)
  d.setDate(d.getDate() - 364)
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1)
  while (d <= today) {
    days.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return days
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function TrackerHeatmap({ tracker, entries, isAdmin }: Props) {
  const router = useRouter()
  const [hover, setHover] = useState<{ date: string; note: string | null; x: number; y: number } | null>(null)
  const [popover, setPopover] = useState<{ date: string; x: number; y: number } | null>(null)

  const entryMap = new Map<string, TrackerEntry>()
  for (const e of entries) entryMap.set(e.date, e)

  const days = buildGrid()
  const weeks: string[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const m = new Date(week[0]).getMonth()
    if (m !== lastMonth) { monthLabels.push({ label: MONTH_LABELS[m], col }); lastMonth = m }
  })

  const today = new Date().toISOString().split('T')[0]
  const CELL = 13
  const GAP = 2

  return (
    <div className="relative">
      <div className="flex mb-1">
        {monthLabels.map(({ label, col }) => (
          <div key={`${label}-${col}`} className="absolute"
            style={{ left: col * (CELL + GAP), top: 0, fontFamily: 'Courier New, monospace', fontSize: 10, color: '#666' }}>{label}</div>
        ))}
      </div>

      <div className="overflow-x-auto pt-5">
        <div className="flex relative" style={{ gap: GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map(date => {
                const entry = entryMap.get(date)
                const active = !!entry
                const isToday = date === today
                const isFuture = date > today
                return (
                  <div
                    key={date}
                    onClick={e => {
                      if (!isAdmin || isFuture) return
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setPopover({ date, x: rect.left, y: rect.bottom + 6 })
                      setHover(null)
                    }}
                    onMouseEnter={e => {
                      if (popover) return
                      const rect = (e.target as HTMLElement).getBoundingClientRect()
                      setHover({ date, note: entry?.note ?? null, x: rect.left, y: rect.top })
                    }}
                    onMouseLeave={() => setHover(null)}
                    className={`transition-colors ${isAdmin && !isFuture ? 'cursor-pointer hover:opacity-80' : ''} ${isFuture ? 'opacity-40' : ''}`}
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: active ? tracker.color : '#e8e2cf',
                      border: isToday ? '1px solid #000' : '1px solid #c8c0a8',
                      boxSizing: 'border-box',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {hover && !popover && (
        <div className="fixed z-50 pointer-events-none"
          style={{
            top: hover.y - 44,
            left: hover.x,
            background: '#ffffe0',
            border: '1px solid #000',
            color: '#000',
            fontFamily: 'Courier New, monospace',
            fontSize: 11,
            padding: '3px 6px',
            boxShadow: '2px 2px 0 #888',
          }}>
          <div>{hover.date}</div>
          {hover.note && <div style={{ color: '#444', marginTop: 2 }}>{hover.note}</div>}
          {!hover.note && entryMap.has(hover.date) && <div style={{ color: '#444', marginTop: 2 }}>{TRACKERS.tooltipLogged}</div>}
        </div>
      )}

      {popover && (
        <EntryPopover
          date={popover.date}
          x={popover.x}
          y={popover.y}
          existing={entryMap.get(popover.date) ?? null}
          trackerId={tracker.id}
          color={tracker.color}
          onClose={() => { setPopover(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function EntryPopover({
  date, x, y, existing, trackerId, color, onClose,
}: {
  date: string
  x: number
  y: number
  existing: TrackerEntry | null
  trackerId: string
  color: string
  onClose: () => void
}) {
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  async function save() {
    setBusy(true)
    await upsertEntry(trackerId, date, note || undefined)
    setBusy(false)
    onClose()
  }

  async function remove() {
    setBusy(true)
    await removeEntry(trackerId, date)
    setBusy(false)
    onClose()
  }

  // Keep popover on screen
  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 280 : x)

  return (
    <div ref={ref}
      className="fixed z-50 window"
      style={{ top: y, left, width: 260 }}>
      <div className="window-titlebar">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: existing ? color : '#888', border: '1px solid #000' }} />
          {date}
        </span>
        <button onClick={onClose} style={{ padding: '0 6px', fontSize: 11 }}>✕</button>
      </div>
      <div className="window-body" style={{ padding: 10 }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="note (optional)"
          rows={2}
          autoFocus
          style={{ width: '100%', resize: 'none', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={busy} style={{ flex: 1, fontWeight: 'bold' }}>
            {busy ? '…' : existing ? TRACKERS.popoverUpdate : TRACKERS.popoverLog}
          </button>
          {existing && (
            <button onClick={remove} disabled={busy} style={{ color: '#a00' }}>
              {TRACKERS.popoverRemove}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
