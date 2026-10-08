'use client'

import { useState, useTransition } from 'react'
import type { Domain, QTask, Urgency } from '@/lib/q/types'
import { byUrgency, urgencyOf } from '@/lib/q/tasks'
import { relativeDay } from '@/lib/q/time'
import { unwrap } from '@/lib/q/act'
import { deleteTask, toggleTask } from '../actions'
import { taskToEvent } from '../plan/actions'
import CheckRow from './CheckRow'
import Sheet from './Sheet'
import { TaskForm } from './forms'
import { toast } from './Toast'

type ProjectRef = { id: string; title: string; domain: Domain }

const LABEL: Record<Urgency, string> = { asap: 'asap', soon: 'soon', whenever: 'whenever' }

/** Open tasks grouped asap → soon → whenever, plus recently done. Tap ⋯ to edit. */
export default function TaskList({
  tasks,
  today: t,
  projects = [],
  showDomain,
  grouped = true,
  title = 'tasks',
}: {
  tasks: QTask[]
  today: string
  projects?: ProjectRef[]
  showDomain?: boolean
  grouped?: boolean
  title?: string
}) {
  const [edit, setEdit] = useState<QTask | null>(null)
  const [pending, start] = useTransition()
  const projectName = new Map(projects.map(p => [p.id, p.title]))
  const open = tasks.filter(x => !x.done_at).sort(byUrgency(t))
  const done = tasks.filter(x => x.done_at)
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
            {!task.done_at && <span className={`q-urg is-${u}`}>{LABEL[u]}</span>}
            {task.due_date && (
              <span className={task.due_date < t && !task.done_at ? 'q-neg' : ''}>{relativeDay(task.due_date, t)}</span>
            )}
            {task.project_id && projectName.get(task.project_id) && <span>▸ {projectName.get(task.project_id)}</span>}
          </>
        }
        value={task.value}
        domain={task.domain}
        done={!!task.done_at}
        onToggle={toggleTask.bind(null, task.id)}
        onMore={() => setEdit(task)}
      />
    )
  }

  const groups: Urgency[] = ['asap', 'soon', 'whenever']

  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>{title}</b></span><span>{open.length} open</span></div>
      {tasks.length === 0 && <p className="q-empty">none yet</p>}
      {grouped
        ? groups.map(g => {
            const list = open.filter(x => urgencyOf(x, t) === g)
            if (!list.length) return null
            return (
              <div key={g}>
                <div className={`q-tiny q-urg-head is-${g}`}>{g}</div>
                {list.map(row)}
              </div>
            )
          })
        : open.map(row)}
      {done.length > 0 && (
        <>
          <div className="q-tiny q-faint" style={{ padding: '8px 12px 0' }}>done</div>
          {done.map(row)}
        </>
      )}

      <Sheet open={!!edit} onClose={close} title="edit task">
        {edit && (
          <>
            <TaskForm task={edit} projects={projects} onDone={close} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="q-btn" style={{ flex: 1 }} disabled={pending} onClick={() => run(() => taskToEvent(edit.id))}>
                → make it an event
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
