'use client'

import { useState, useTransition } from 'react'
import type { Domain, QTask, Urgency } from '@/lib/q/types'
import { byUrgency, urgencyOf } from '@/lib/q/tasks'
import { dateOf, formatShort, relativeDay } from '@/lib/q/time'
import { unwrap } from '@/lib/q/act'
import { deleteTask, toggleTask } from '../actions'
import { taskToEvent } from '../plan/actions'
import CheckRow from './CheckRow'
import Sheet from './Sheet'
import { TaskForm } from './forms'
import { toast } from './Toast'

type ProjectRef = { id: string; title: string; domain: Domain }

/**
 * Tasks with the box to tick and the row to open/edit.
 * - grouped: split under asap / soon / whenever (domain pages)
 * - focus: only show these until "see all tasks" unfolds the rest (Today)
 */
export default function TaskList({
  tasks,
  today: t,
  projects = [],
  showDomain,
  grouped = true,
  focus,
  title = 'tasks',
}: {
  tasks: QTask[]
  today: string
  projects?: ProjectRef[]
  showDomain?: boolean
  grouped?: boolean
  focus?: (task: QTask) => boolean
  title?: string
}) {
  const [edit, setEdit] = useState<QTask | null>(null)
  const [all, setAll] = useState(false)
  const [pending, start] = useTransition()
  const projectName = new Map(projects.map(p => [p.id, p.title]))
  const open = tasks.filter(x => !x.done_at).sort(byUrgency(t))
  const done = tasks.filter(x => x.done_at)
  const shown = focus && !all ? open.filter(focus) : open
  const hidden = open.length - shown.length
  const close = () => setEdit(null)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try {
        unwrap(await fn())
        close()
      } catch (e) {
        toast(`✕ ${e instanceof Error ? e.message : 'failed'}`)
      }
    })
  }

  const row = (task: QTask) => {
    const u = urgencyOf(task, t)
    return (
      <CheckRow
        key={task.id}
        title={task.title}
        sub={
          <>
            {showDomain && <span className="q-tag" data-d={task.domain}>{task.domain}</span>}
            {!task.done_at && <span className={`q-urg is-${u}`}>{u}</span>}
            {task.done_at && <span>done {relativeDay(dateOf(task.done_at), t)}</span>}
            {!task.done_at && task.due_date && (
              <span className={task.due_date < t ? 'q-neg' : ''}>due {relativeDay(task.due_date, t)}</span>
            )}
            {task.project_id && projectName.get(task.project_id) && <span>▸ {projectName.get(task.project_id)}</span>}
          </>
        }
        value={task.value}
        domain={task.domain}
        done={!!task.done_at}
        onToggle={toggleTask.bind(null, task.id)}
        onOpen={() => setEdit(task)}
      />
    )
  }

  const groups: Urgency[] = ['asap', 'soon', 'whenever']

  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>{title}</b></span><span>{open.length} open</span></div>
      {tasks.length === 0 && <p className="q-empty">none yet</p>}
      {focus && shown.length === 0 && hidden > 0 && <p className="q-empty">nothing due today</p>}
      {grouped && !focus
        ? groups.map(g => {
            const list = shown.filter(x => urgencyOf(x, t) === g)
            if (!list.length) return null
            return (
              <div key={g}>
                <div className={`q-tiny q-urg-head is-${g}`}>{g}</div>
                {list.map(row)}
              </div>
            )
          })
        : shown.map(row)}
      {focus && (hidden > 0 || all) && (
        <button type="button" className="q-unfold" onClick={() => setAll(!all)}>
          {all ? 'show less ▴' : `see all tasks (${open.length}) ▾`}
        </button>
      )}
      {done.length > 0 && (!focus || all) && (
        <>
          <div className="q-sub-head">recently done</div>
          {done.map(row)}
        </>
      )}

      <Sheet open={!!edit} onClose={close} title="task">
        {edit && (
          <>
            <p className="q-tiny q-faint" style={{ marginBottom: 12 }}>
              added {formatShort(dateOf(edit.created_at))}
              {edit.done_at && ` · done ${formatShort(dateOf(edit.done_at))}`}
            </p>
            <TaskForm task={edit} projects={projects} onDone={close} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="q-btn" style={{ flex: 1 }} disabled={pending} onClick={() => run(() => taskToEvent(edit.id))}>
                → make it a hang/event
              </button>
              <button
                className="q-btn is-danger"
                style={{ flex: 1 }}
                disabled={pending}
                onClick={() => confirm('delete task?') && run(() => deleteTask(edit.id))}
              >
                delete
              </button>
            </div>
          </>
        )}
      </Sheet>
    </section>
  )
}
