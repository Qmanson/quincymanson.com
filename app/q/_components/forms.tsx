'use client'

import { useEffect, useState } from 'react'
import { SUBSTANCES, URGENCIES, type Domain, type LogKind, type QLogType, type QRoutine, type QTask } from '@/lib/q/types'
import { TASK_SIZES } from '@/lib/q/points'
import { today } from '@/lib/q/time'
import {
  addLog,
  logFormData,
  createLogType,
  createRoutine,
  createTask,
  updateLogType,
  updateRoutine,
  updateTask,
} from '../actions'
import QForm from './Form'
import { unwrap } from '@/lib/q/act'
import { DomainPicker, Seg } from './Pickers'
import { LiftRows, MediaPicker, PeoplePicker, PhotoInput, Stars, TagInput } from './log/inputs'

type Done = { onDone?: () => void }

// ── task ────────────────────────────────────────────────────

export function TaskForm({
  task,
  domain,
  projectId,
  projects = [],
  onDone,
}: Done & {
  task?: QTask
  domain?: Domain
  projectId?: string
  projects?: { id: string; title: string; domain: Domain }[]
}) {
  const [value, setValue] = useState(task?.value ?? TASK_SIZES.S)
  const [due, setDue] = useState(task?.due_date ?? '')
  const sizes = Object.keys(TASK_SIZES) as (keyof typeof TASK_SIZES)[]
  return (
    <QForm action={task ? updateTask.bind(null, task.id) : createTask} onDone={onDone}>
      <label className="q-field">
        what
        <textarea name="title" required rows={2} defaultValue={task?.title} placeholder="fix closet light" autoFocus={!task} />
      </label>
      <DomainPicker initial={task?.domain ?? domain} />
      <div className="q-field">
        how urgent
        <Seg
          name="urgency"
          initial={task?.urgency ?? 'whenever'}
          options={URGENCIES.map(u => ({ value: u, label: u }))}
        />
        {due && <span className="q-small q-dim">has a date, so it sorts itself by how close it is</span>}
      </div>
      <div className="q-field">
        size
        <Seg
          name="size"
          initial={sizes.find(k => TASK_SIZES[k] === value)}
          options={sizes.map(k => ({ value: k, label: `${k} · ${TASK_SIZES[k]}` }))}
          onChange={k => setValue(TASK_SIZES[k])}
        />
      </div>
      <div className="q-form-row">
        <label className="q-field">
          Q$
          <input name="value" type="number" inputMode="numeric" value={value} onChange={e => setValue(Number(e.target.value))} />
        </label>
        <label className="q-field">
          due
          <input name="due_date" type="date" value={due} onChange={e => setDue(e.target.value)} />
        </label>
      </div>
      {projects.length > 0 && (
        <label className="q-field">
          project
          <select name="project_id" defaultValue={task?.project_id ?? projectId ?? ''}>
            <option value="">— none —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title} · {p.domain}</option>)}
          </select>
        </label>
      )}
      {projects.length === 0 && (task?.project_id || projectId) && (
        <input type="hidden" name="project_id" value={task?.project_id ?? projectId} />
      )}
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
      <div className="q-field">
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
      </div>
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

const KIND_OPTS: { value: LogKind; label: string }[] = [
  { value: 'basic', label: 'amount + note' },
  { value: 'run', label: 'distance + time' },
  { value: 'lift', label: 'workouts' },
  { value: 'movie', label: 'film' },
  { value: 'book', label: 'book' },
  { value: 'album', label: 'album' },
  { value: 'event', label: 'event + people' },
  { value: 'photo', label: 'photo' },
  { value: 'substance', label: 'substances' },
]

export function LogTypeForm({ logType, domain, onDone }: Done & { logType?: QLogType; domain?: Domain }) {
  const [kind, setKind] = useState<LogKind>(logType?.kind ?? 'basic')
  return (
    <QForm action={logType ? updateLogType.bind(null, logType.id) : createLogType} onDone={onDone}>
      <label className="q-field">
        name
        <input name="name" required defaultValue={logType?.name} placeholder="bike" autoFocus={!logType} />
      </label>
      <DomainPicker initial={logType?.domain ?? domain} />
      <div className="q-field">
        what you fill in
        <Seg name="kind" initial={kind} options={KIND_OPTS} onChange={setKind} />
      </div>
      <div className="q-form-row">
        {kind === 'basic' || kind === 'run' ? (
          <label className="q-field">
            unit (optional)
            <input name="unit" defaultValue={logType?.unit ?? (kind === 'run' ? 'mi' : '')} placeholder="mi" />
          </label>
        ) : (
          <span />
        )}
        <label className="q-field">
          Q$ per log
          <input name="value" type="number" inputMode="numeric" defaultValue={logType?.value ?? 20} />
        </label>
      </div>
    </QForm>
  )
}

type Aux = { workouts: string[]; people: { id: string; name: string }[]; tags: string[] }

export function LogForm({ logType, onDone }: Done & { logType: QLogType }) {
  const [aux, setAux] = useState<Aux>({ workouts: [], people: [], tags: [] })
  useEffect(() => {
    let live = true
    logFormData(logType.id).then(a => live && setAux(unwrap(a))).catch(() => {})
    return () => { live = false }
  }, [logType.id])

  const k = logType.kind
  const isMedia = k === 'movie' || k === 'book' || k === 'album'
  const day = (
    <label className="q-field">
      day
      <input name="logged_on" type="date" defaultValue={today()} />
    </label>
  )

  return (
    <QForm action={addLog} onDone={onDone} submit={`log${logType.value ? ` +${logType.value}` : ''}`}>
      <input type="hidden" name="log_type_id" value={logType.id} />

      {k === 'basic' && (
        <>
          <div className="q-form-row">
            {logType.unit ? (
              <label className="q-field">
                {logType.unit}
                <input name="amount" type="number" inputMode="decimal" step="any" autoFocus />
              </label>
            ) : <span />}
            {day}
          </div>
          <label className="q-field">note<textarea name="note" rows={2} autoFocus={!logType.unit} /></label>
        </>
      )}

      {k === 'run' && (
        <>
          <div className="q-form-row">
            <label className="q-field">
              {logType.unit ?? 'mi'}
              <input name="amount" type="number" inputMode="decimal" step="any" required autoFocus />
            </label>
            <label className="q-field">
              time
              <input name="time" inputMode="numeric" placeholder="mm:ss" pattern="[0-9:]*" />
            </label>
          </div>
          {day}
        </>
      )}

      {k === 'lift' && (
        <>
          <LiftRows workouts={aux.workouts} />
          {day}
        </>
      )}

      {k === 'substance' && (
        <>
          <div className="q-seg">
            {SUBSTANCES.map(sub => (
              <label key={sub} className="q-check-chip">
                <input type="checkbox" name="substances" value={sub} />
                <span>{sub}</span>
              </label>
            ))}
          </div>
          {day}
          <label className="q-field">note<textarea name="note" rows={2} /></label>
        </>
      )}

      {isMedia && (
        <>
          <MediaPicker kind={k} name="media" />
          <div className="q-field">rating<Stars name="rating" /></div>
          <div className="q-field">tags<TagInput name="tags" suggestions={aux.tags} /></div>
          <label className="q-field">review<textarea name="note" rows={3} /></label>
          {day}
        </>
      )}

      {k === 'event' && (
        <>
          <label className="q-field">what<input name="title" placeholder="chicago local music night" autoFocus /></label>
          <div className="q-field">who was there<PeoplePicker people={aux.people} /></div>
          <div className="q-field">tags<TagInput name="tags" suggestions={aux.tags} /></div>
          {day}
          <label className="q-field">note<textarea name="note" rows={2} /></label>
        </>
      )}

      {k === 'photo' && (
        <>
          <PhotoInput name="photo_path" cropName="photo_crop" folder="logs" />
          <div className="q-field">tags<TagInput name="tags" suggestions={aux.tags} /></div>
          {day}
          <label className="q-field">note<textarea name="note" rows={2} /></label>
        </>
      )}
    </QForm>
  )
}
