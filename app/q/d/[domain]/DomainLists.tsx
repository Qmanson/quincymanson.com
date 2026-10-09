'use client'

import { useState, useTransition } from 'react'
import type { QLogType, QRoutine } from '@/lib/q/types'
import type { LogView } from '@/lib/q/logview'
import { starText } from '@/lib/q/points'
import { cropStyle } from '@/lib/q/crop'
import { relativeDay } from '@/lib/q/time'
import Sheet from '../../_components/Sheet'
import { LogForm, LogTypeForm } from '../../_components/forms'
import { toast } from '../../_components/Toast'
import { unwrap } from '@/lib/q/act'
import { Cover } from '../../_components/log/inputs'
import RoutineRow, { RoutineSheet } from '../../_components/RoutineRow'
import { deleteLog, setLogTypeActive } from '../../actions'

const CADENCE_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'interval'] as const
const CADENCE_HEAD = {
  daily: 'every day', weekly: 'every week', monthly: 'every month',
  quarterly: 'every quarter', yearly: 'every year', interval: 'every few days',
} as const

type Edit = { kind: 'logType'; item: QLogType } | { kind: 'log'; item: QLogType } | null

export default function DomainLists({
  routines,
  doneIds,
  logTypes,
  logs,
}: {
  routines: QRoutine[]
  /** routines already done for their current period */
  doneIds: string[]
  logTypes: QLogType[]
  logs: LogView[]
}) {
  const [edit, setEdit] = useState<Edit>(null)
  const [pausedOpen, setPausedOpen] = useState<QRoutine | null>(null)
  const [pending, start] = useTransition()
  const close = () => setEdit(null)
  const done = new Set(doneIds)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try { unwrap(await fn()); close() } catch (e) { toast(`✕ ${e instanceof Error ? e.message : 'failed'}`) }
    })
  }

  const active = routines.filter(r => r.active)
  const paused = routines.filter(r => !r.active)

  return (
    <>
      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>routines</b></span><span>tap one for its history</span></div>
        {active.length === 0 && <p className="q-empty">none yet</p>}
        {CADENCE_ORDER.map(c => {
          const rs = active.filter(r => r.cadence === c)
          if (!rs.length) return null
          return (
            <div key={c}>
              <div className="q-sub-head">{CADENCE_HEAD[c]}</div>
              {rs.map(r => (
                <RoutineRow
                  key={r.id}
                  r={r}
                  done={done.has(r.id)}
                  showDomain={false}
                  sub={r.cadence === 'interval' ? <span>every {r.interval_days}d</span> : undefined}
                />
              ))}
            </div>
          )
        })}
        {paused.length > 0 && (
          <>
            <div className="q-sub-head">paused</div>
            {paused.map(r => (
              <button key={r.id} type="button" className="q-row is-done" onClick={() => setPausedOpen(r)}>
                <span className="q-row-main"><span className="q-row-title">{r.title}</span></span>
                <span className="q-chev">›</span>
              </button>
            ))}
          </>
        )}
        {pausedOpen && <RoutineSheet r={pausedOpen} open onClose={() => setPausedOpen(null)} />}
      </section>

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>logs</b></span><span>tap to log</span></div>
        {logTypes.length > 0 ? (
          <div className="q-chips">
            {logTypes.map(lt => (
              <button key={lt.id} type="button" className={`q-chip ${lt.active ? '' : 'q-faint'}`} onClick={() => setEdit({ kind: 'log', item: lt })}>
                {lt.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="q-empty">no log types yet</p>
        )}
        {logs.map(l => (
          <div key={l.id} className="q-row" style={{ alignItems: 'flex-start' }}>
            {l.mediaKind && <Cover url={l.cover} kind={l.mediaKind} size={40} />}
            {l.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <a href={l.photo} target="_blank" rel="noreferrer" className="q-thumb q-cropped"><img src={l.photo} alt="" style={cropStyle(l.photoCrop)} /></a>
            )}
            <span className="q-row-main" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="q-row-title">
                {l.kind === 'photo' || l.kind === 'basic' || l.kind === 'run' || l.kind === 'lift' || l.kind === 'substance' || l.kind === 'sleep'
                  ? l.type
                  : l.title}
              </span>
              {l.detail && <span className="q-small" style={{ whiteSpace: 'normal' }}>{l.detail}</span>}
              {l.rating !== null && <span className="q-rating">{starText(l.rating)}</span>}
              {l.people.length > 0 && <span className="q-small q-dim">with {l.people.join(', ')}</span>}
              {l.note && <span className="q-small q-dim" style={{ whiteSpace: 'pre-wrap' }}>{l.note}</span>}
              {l.tags.length > 0 && <span className="q-tags">{l.tags.map(t => <span key={t}>#{t}</span>)}</span>}
              <span className="q-tiny q-faint">{relativeDay(l.logged_on)}</span>
            </span>
            <button
              type="button"
              className="q-faint q-small"
              style={{ padding: '4px 8px' }}
              disabled={pending}
              onClick={() => confirm('delete this log?') && run(() => deleteLog(l.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      <Sheet open={edit?.kind === 'log'} onClose={close} title={edit?.kind === 'log' ? `log ${edit.item.name}` : ''}>
        {edit?.kind === 'log' && (
          <>
            <LogForm logType={edit.item} onDone={close} />
            <button className="q-btn is-block" style={{ marginTop: 10 }} onClick={() => setEdit({ kind: 'logType', item: edit.item })}>
              edit log type
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={edit?.kind === 'logType'} onClose={close} title="edit log type">
        {edit?.kind === 'logType' && (
          <>
            <LogTypeForm logType={edit.item} onDone={close} />
            <button
              className="q-btn is-block"
              style={{ marginTop: 10 }}
              disabled={pending}
              onClick={() => run(() => setLogTypeActive(edit.item.id, !edit.item.active))}
            >
              {edit.item.active ? 'hide from quick log' : 'show in quick log'}
            </button>
          </>
        )}
      </Sheet>
    </>
  )
}
