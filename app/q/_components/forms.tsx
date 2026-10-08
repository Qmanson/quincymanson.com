'use client'

import { useState } from 'react'
import type { Domain, QLogType, QRoutine, QTask } from '@/lib/q/types'
import { TASK_SIZES } from '@/lib/q/points'
import { today } from '@/lib/q/time'
import {
  addLog,
  createLogType,
  createRoutine,
  createTask,
  updateLogType,
  updateRoutine,
  updateTask,
} from '../actions'
import QForm from './Form'
import { DomainPicker, Seg } from './Pickers'

type Done = { onDone?: () => void }

// ── task ────────────────────────────────────────────────────

export function TaskForm({ task, domain, onDone }: Done & { task?: QTask; domain?: Domain }) {
  const [value, setValue] = useState(task?.value ?? TASK_SIZES.S)
  return (
    <QForm action={task ? updateTask.bind(null, task.id) : createTask} onDone={onDone}>
      <label className="q-field">
        what
        <input name="title" required defaultValue={task?.title} placeholder="fix closet light" autoFocus={!task} />
      </label>
      <DomainPicker initial={task?.domain ?? domain} />
      <label className="q-field">
        size
        <Seg
          name="size"
          initial={(Object.keys(TASK_SIZES) as (keyof typeof TASK_SIZES)[]).find(k => TASK_SIZES[k] === value)}
          options={(Object.keys(TASK_SIZES) as (keyof typeof TASK_SIZES)[]).map(k => ({
            value: k,
            label: `${k} · ${TASK_SIZES[k]}`,
          }))}
          onChange={k => setValue(TASK_SIZES[k])}
        />
      </label>
      <div className="q-form-row">
        <label className="q-field">
          Q$
          <input name="value" type="number" inputMode="numeric" value={value} onChange={e => setValue(Number(e.target.value))} />
        </label>
        <label className="q-field">
          due
          <input name="due_date" type="date" defaultValue={task?.due_date ?? ''} />
        </label>
      </div>
      <label className="q-field">
        notes
        <textarea name="notes" rows={2} defaultValue={task?.notes ?? ''} />
      </label>
    </QForm>
  )
}

// ── routine ─────────────────────────────────────────────────

const CADENCE_OPTS = [
  { value: 'daily', label: 'daily' },
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'quarterly', label: 'quarterly' },
  { value: 'yearly', label: 'yearly' },
  { value: 'interval', label: 'every n days' },
] as const

const DEFAULT_VALUE: Record<string, number> = {
  daily: 10, weekly: 50, monthly: 150, quarterly: 400, yearly: 1000, interval: 50,
}

export function RoutineForm({ routine, domain, onDone }: Done & { routine?: QRoutine; domain?: Domain }) {
  const [cadence, setCadence] = useState<string>(routine?.cadence ?? 'daily')
  const [value, setValue] = useState(routine?.value ?? DEFAULT_VALUE.daily)
  return (
    <QForm action={routine ? updateRoutine.bind(null, routine.id) : createRoutine} onDone={onDone}>
      <label className="q-field">
        what
        <input name="title" required defaultValue={routine?.title} placeholder="floss" autoFocus={!routine} />
      </label>
      <DomainPicker initial={routine?.domain ?? domain} />
      <label className="q-field">
        how often
        <Seg
          name="cadence"
          initial={cadence}
          options={CADENCE_OPTS}
          onChange={c => {
            setCadence(c)
            if (!routine) setValue(DEFAULT_VALUE[c])
          }}
        />
      </label>
      {cadence === 'interval' && (
        <label className="q-field">
          every how many days
          <input name="interval_days" type="number" inputMode="numeric" min={1} defaultValue={routine?.interval_days ?? 42} />
        </label>
      )}
      <div className="q-form-row">
        <label className="q-field">
          Q$ when done
          <input name="value" type="number" inputMode="numeric" value={value} onChange={e => setValue(Number(e.target.value))} />
        </label>
        <label className="q-field">
          miss penalty
          <input
            name="miss_penalty"
            type="number"
            inputMode="numeric"
            defaultValue={routine?.miss_penalty ?? ''}
            placeholder={`${Math.ceil(value / 2)} (half)`}
          />
        </label>
      </div>
      <label className="q-field">
        notes
        <textarea name="notes" rows={2} defaultValue={routine?.notes ?? ''} />
      </label>
    </QForm>
  )
}

// ── log types + logs ────────────────────────────────────────

export function LogTypeForm({ logType, domain, onDone }: Done & { logType?: QLogType; domain?: Domain }) {
  return (
    <QForm action={logType ? updateLogType.bind(null, logType.id) : createLogType} onDone={onDone}>
      <div className="q-form-row" style={{ gridTemplateColumns: '64px 1fr' }}>
        <label className="q-field">
          icon
          <input name="icon" defaultValue={logType?.icon ?? ''} placeholder="🏃" maxLength={4} />
        </label>
        <label className="q-field">
          name
          <input name="name" required defaultValue={logType?.name} placeholder="run" autoFocus={!logType} />
        </label>
      </div>
      <DomainPicker initial={logType?.domain ?? domain} />
      <div className="q-form-row">
        <label className="q-field">
          unit (optional)
          <input name="unit" defaultValue={logType?.unit ?? ''} placeholder="mi" />
        </label>
        <label className="q-field">
          Q$ per log
          <input name="value" type="number" inputMode="numeric" defaultValue={logType?.value ?? 20} />
        </label>
      </div>
    </QForm>
  )
}

export function LogForm({ logType, onDone }: Done & { logType: QLogType }) {
  return (
    <QForm action={addLog} onDone={onDone} submit={`log${logType.value ? ` +${logType.value}` : ''}`}>
      <input type="hidden" name="log_type_id" value={logType.id} />
      <div className="q-form-row">
        {logType.unit ? (
          <label className="q-field">
            {logType.unit}
            <input name="amount" type="number" inputMode="decimal" step="any" autoFocus />
          </label>
        ) : (
          <span />
        )}
        <label className="q-field">
          day
          <input name="logged_on" type="date" defaultValue={today()} />
        </label>
      </div>
      <label className="q-field">
        note
        <textarea name="note" rows={2} placeholder={logType.unit ? '' : 'title, thoughts…'} autoFocus={!logType.unit} />
      </label>
    </QForm>
  )
}
