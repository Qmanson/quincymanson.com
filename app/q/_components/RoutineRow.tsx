'use client'

import { useEffect, useState, useTransition } from 'react'
import type { QRoutine } from '@/lib/q/types'
import { dateOf, formatDow, formatShort } from '@/lib/q/time'
import { missPenalty } from '@/lib/q/points'
import { unwrap } from '@/lib/q/act'
import { routineHistory, setRoutineActive, toggleRoutine } from '../actions'
import CheckRow from './CheckRow'
import Sheet from './Sheet'
import { RoutineForm } from './forms'
import { toast } from './Toast'

type Check = { period_start: string; status: 'done' | 'late' | 'missed'; done_at: string | null }

const PERIOD: Record<QRoutine['cadence'], string> = {
  daily: 'day', weekly: 'week of', monthly: 'month of', quarterly: 'quarter from', yearly: 'year', interval: '',
}

/** Sheet with a routine's history and its settings. */
export function RoutineSheet({ r, open, onClose }: { r: QRoutine; open: boolean; onClose: () => void }) {
  const [history, setHistory] = useState<Check[] | null>(null)
  const [edit, setEdit] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!open) return
    let live = true
    routineHistory(r.id).then(h => live && setHistory(unwrap(h) as Check[])).catch(() => live && setHistory([]))
    return () => { live = false }
  }, [open, r.id])

  const done = (history ?? []).filter(h => h.status !== 'missed').length
  const total = history?.length ?? 0

  return (
    <Sheet open={open} onClose={() => { setEdit(false); onClose() }} title={r.title}>
      {!edit ? (
        <>
          <p className="q-small q-dim" style={{ marginBottom: 12 }}>
            {r.cadence === 'interval' ? `every ${r.interval_days} days` : r.cadence} · +{r.value} done · −{missPenalty(r)} missed
          </p>
          <div className="q-panel">
            <div className="q-panel-title">
              <span>▸ <b>history</b></span>
              <span>{total ? `${done}/${total} kept` : ''}</span>
            </div>
            {history === null && <p className="q-empty">loading…</p>}
            {history?.length === 0 && <p className="q-empty">nothing yet</p>}
            {history?.map(h => (
              <div key={h.period_start} className="q-row" style={{ minHeight: 40 }}>
                <span className={`q-box ${h.status === 'missed' ? 'is-missed' : 'is-on'}`} style={{ width: 20, height: 20, fontSize: 12 }}>
                  {h.status === 'missed' ? '!' : '✓'}
                </span>
                <span className="q-row-main">
                  <span className="q-row-title">
                    {PERIOD[r.cadence]} {formatDow(h.period_start)} {formatShort(h.period_start)}
                  </span>
                  <span className="q-row-sub">
                    {h.status === 'missed' ? 'missed' : h.status === 'late' ? 'done late' : 'done'}
                    {h.done_at && ` · ticked ${formatDow(dateOf(h.done_at))} ${formatShort(dateOf(h.done_at))}`}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="q-btn" style={{ flex: 1 }} onClick={() => setEdit(true)}>edit</button>
            <button
              className="q-btn"
              style={{ flex: 1 }}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    unwrap(await setRoutineActive(r.id, !r.active))
                    onClose()
                  } catch (e) {
                    toast(`✕ ${e instanceof Error ? e.message : 'failed'}`)
                  }
                })
              }
            >
              {r.active ? 'pause' : 'resume'}
            </button>
          </div>
        </>
      ) : (
        <RoutineForm routine={r} onDone={() => { setEdit(false); onClose() }} />
      )}
    </Sheet>
  )
}

/** A routine you can tick (box) or open for history (row). */
export default function RoutineRow({
  r,
  done,
  sub,
  showDomain = true,
}: {
  r: QRoutine
  done: boolean
  sub?: React.ReactNode
  showDomain?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <CheckRow
        title={r.title}
        sub={<>{showDomain && <span className="q-tag" data-d={r.domain}>{r.domain}</span>}{sub}</>}
        value={r.value}
        domain={r.domain}
        done={done}
        onToggle={toggleRoutine.bind(null, r.id)}
        onOpen={() => setOpen(true)}
      />
      <RoutineSheet r={r} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
