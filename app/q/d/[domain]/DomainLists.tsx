'use client'

import { useState, useTransition } from 'react'
import type { QLogType, QRoutine, QTask } from '@/lib/q/types'
import type { LogView } from '@/lib/q/logview'
import { missPenalty, starText } from '@/lib/q/points'
import { relativeDay } from '@/lib/q/time'
import Sheet from '../../_components/Sheet'
import CheckRow from '../../_components/CheckRow'
import { LogForm, LogTypeForm, RoutineForm, TaskForm } from '../../_components/forms'
import { toast } from '../../_components/Toast'
import { Cover } from '../../_components/log/inputs'
import { deleteLog, deleteTask, setLogTypeActive, setRoutineActive, toggleTask } from '../../actions'

const CADENCE_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'interval'] as const

type Edit =
  | { kind: 'routine'; item: QRoutine }
  | { kind: 'task'; item: QTask }
  | { kind: 'logType'; item: QLogType }
  | { kind: 'log'; item: QLogType }
  | null

export default function DomainLists({
  routines,
  tasks,
  logTypes,
  logs,
}: {
  routines: QRoutine[]
  tasks: QTask[]
  logTypes: QLogType[]
  logs: LogView[]
}) {
  const [edit, setEdit] = useState<Edit>(null)
  const [pending, start] = useTransition()
  const close = () => setEdit(null)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try { await fn(); close() } catch { toast('✕ failed') }
    })
  }

  const active = routines.filter(r => r.active)
  const paused = routines.filter(r => !r.active)

  return (
    <>
      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>routines</b></span><span>{active.length}</span></div>
        {active.length === 0 && <p className="q-empty">none yet</p>}
        {CADENCE_ORDER.map(c => {
          const rs = active.filter(r => r.cadence === c)
          if (!rs.length) return null
          return (
            <div key={c}>
              <div className="q-tiny q-faint" style={{ padding: '8px 12px 0' }}>{c === 'interval' ? 'every n days' : c}</div>
              {rs.map(r => (
                <button key={r.id} type="button" className="q-row" onClick={() => setEdit({ kind: 'routine', item: r })}>
                  <span className="q-row-main">
                    <span className="q-row-title" style={{ display: 'block' }}>{r.title}</span>
                    <span className="q-row-sub">
                      miss −{missPenalty(r)}{r.cadence === 'interval' ? ` · every ${r.interval_days}d` : ''}
                    </span>
                  </span>
                  <span className="q-value">+{r.value}</span>
                </button>
              ))}
            </div>
          )
        })}
        {paused.length > 0 && (
          <>
            <div className="q-tiny q-faint" style={{ padding: '8px 12px 0' }}>paused</div>
            {paused.map(r => (
              <button key={r.id} type="button" className="q-row is-done" onClick={() => setEdit({ kind: 'routine', item: r })}>
                <span className="q-row-main"><span className="q-row-title" style={{ display: 'block' }}>{r.title}</span></span>
                <span className="q-value">+{r.value}</span>
              </button>
            ))}
          </>
        )}
      </section>

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>tasks</b></span><span>{tasks.filter(t => !t.done_at).length} open</span></div>
        {tasks.length === 0 && <p className="q-empty">none yet</p>}
        {tasks.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'stretch' }}>
            <CheckRow
              title={task.title}
              sub={task.due_date ? <span>{relativeDay(task.due_date)}</span> : undefined}
              value={task.value}
              domain={task.domain}
              done={!!task.done_at}
              onToggle={toggleTask.bind(null, task.id)}
            />
            <button
              type="button"
              aria-label="edit"
              className="q-faint"
              style={{ padding: '0 14px', borderBottom: '1px solid rgba(122,162,255,0.07)' }}
              onClick={() => setEdit({ kind: 'task', item: task })}
            >
              ⋯
            </button>
          </div>
        ))}
      </section>

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>logs</b></span></div>
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
              <a href={l.photo} target="_blank" rel="noreferrer"><img className="q-thumb" src={l.photo} alt="" /></a>
            )}
            <span className="q-row-main" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="q-row-title">
                {l.kind === 'photo' || l.kind === 'basic' || l.kind === 'run' || l.kind === 'lift' || l.kind === 'substance'
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
              disabled={pending}
              onClick={() => confirm('delete this log?') && run(() => deleteLog(l.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      <Sheet open={edit?.kind === 'routine'} onClose={close} title="edit routine">
        {edit?.kind === 'routine' && (
          <>
            <RoutineForm routine={edit.item} onDone={close} />
            <button
              className="q-btn is-block"
              style={{ marginTop: 10 }}
              disabled={pending}
              onClick={() => run(() => setRoutineActive(edit.item.id, !edit.item.active))}
            >
              {edit.item.active ? 'pause (no more misses)' : 'resume from today'}
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={edit?.kind === 'task'} onClose={close} title="edit task">
        {edit?.kind === 'task' && (
          <>
            <TaskForm task={edit.item} onDone={close} />
            <button
              className="q-btn is-danger is-block"
              style={{ marginTop: 10 }}
              disabled={pending}
              onClick={() => confirm('delete task?') && run(() => deleteTask(edit.item.id))}
            >
              delete
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={edit?.kind === 'log'} onClose={close} title={edit?.kind === 'log' ? `log ${edit.item.name}` : ''}>
        {edit?.kind === 'log' && (
          <>
            <LogForm logType={edit.item} onDone={close} />
            <button
              className="q-btn is-block"
              style={{ marginTop: 10 }}
              onClick={() => setEdit({ kind: 'logType', item: edit.item })}
            >
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
