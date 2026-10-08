'use client'

import { useState } from 'react'
import type { Domain } from '@/lib/q/types'
import Sheet from './Sheet'
import { LogTypeForm, RoutineForm, TaskForm } from './forms'

type Kind = 'task' | 'routine' | 'log type'
const KINDS: Kind[] = ['task', 'routine', 'log type']

/** Floating + that opens a sheet for adding a task, routine or log type. */
export default function AddFab({
  domain,
  projects,
}: {
  domain?: Domain
  projects?: { id: string; title: string; domain: Domain }[]
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>('task')
  const close = () => setOpen(false)

  return (
    <>
      <button type="button" className="q-fab" aria-label="add" onClick={() => setOpen(true)}>+</button>
      <Sheet open={open} onClose={close} title={`new ${kind}`}>
        <div className="q-seg" style={{ marginBottom: 16 }}>
          {KINDS.map(k => (
            <button key={k} type="button" className={k === kind ? 'is-on' : ''} onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>
        {kind === 'task' && <TaskForm key="t" domain={domain} projects={projects} onDone={close} />}
        {kind === 'routine' && <RoutineForm key="r" domain={domain} onDone={close} />}
        {kind === 'log type' && <LogTypeForm key="l" domain={domain} onDone={close} />}
      </Sheet>
    </>
  )
}
