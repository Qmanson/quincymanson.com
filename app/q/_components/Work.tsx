'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import type { QJob, QShift } from '@/lib/q/types'
import { formatDow, formatShort, relativeDay, today } from '@/lib/q/time'
import { unwrap } from '@/lib/q/act'
import { claimShift, createJob, deleteShift, logShift, planShift, updateJob } from '../work/actions'
import QForm from './Form'
import Sheet from './Sheet'
import { Seg } from './Pickers'
import { toast } from './Toast'

export const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function JobForm({ job, onDone }: { job?: QJob; onDone: () => void }) {
  return (
    <QForm action={job ? updateJob.bind(null, job.id) : createJob} onDone={onDone}>
      <label className="q-field">
        job
        <input name="name" required defaultValue={job?.name} placeholder="walden" />
      </label>
      <div className="q-form-row">
        <label className="q-field">
          wage $/hr
          <input name="wage" type="number" inputMode="decimal" step="0.01" defaultValue={job?.wage ?? ''} required />
        </label>
        <label className="q-field">
          Q$ per hour
          <input name="q_per_hour" type="number" inputMode="numeric" defaultValue={job?.q_per_hour ?? 10} />
        </label>
      </div>
    </QForm>
  )
}

/** Log a worked shift, plan one ahead, or claim a planned one. */
export function ShiftForm({
  jobs,
  mode,
  shift,
  locations,
  jobId,
  onDone,
}: {
  jobs: QJob[]
  mode: 'log' | 'plan' | 'claim'
  shift?: QShift
  locations: Record<string, string[]>
  jobId?: string
  onDone: () => void
}) {
  const [job, setJob] = useState(shift?.job_id ?? jobId ?? jobs[0]?.id ?? '')
  const action = mode === 'claim' && shift ? claimShift.bind(null, shift.id) : mode === 'plan' ? planShift : logShift
  const known = locations[job] ?? []
  return (
    <QForm action={action} onDone={onDone} submit={mode === 'plan' ? 'plan shift' : mode === 'claim' ? 'claim shift' : 'log shift'}>
      {mode === 'claim' ? (
        <input type="hidden" name="job_id" value={job} />
      ) : (
        <div className="q-field">
          job
          <Seg name="job_id" initial={job} options={jobs.map(j => ({ value: j.id, label: j.name }))} onChange={setJob} />
        </div>
      )}
      <div className="q-form-row">
        <label className="q-field">
          day
          <input name="worked_on" type="date" required defaultValue={shift?.worked_on ?? today()} />
        </label>
        <label className="q-field">
          hours
          <input
            name="hours"
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0"
            required={mode !== 'plan'}
            defaultValue={shift?.hours ?? ''}
            autoFocus={mode === 'claim'}
          />
        </label>
      </div>
      <label className="q-field">
        where
        <input name="location" list={`q-loc-${job}`} defaultValue={shift?.location ?? known[0] ?? ''} placeholder="location" />
        <datalist id={`q-loc-${job}`}>{known.map(l => <option key={l} value={l} />)}</datalist>
      </label>
      <label className="q-field">
        note
        <input name="note" defaultValue={shift?.note ?? ''} />
      </label>
    </QForm>
  )
}

export type WorkData = {
  jobs: QJob[]
  planned: QShift[]
  recent: QShift[]
  locations: Record<string, string[]>
  week: { hours: number; pay: number }
}

/** The admn work panel: jobs, shifts to claim, recent shifts. */
export default function Work({ jobs, planned, recent, locations, week }: WorkData) {
  const [sheet, setSheet] = useState<null | { kind: 'job' } | { kind: 'log' | 'plan' } | { kind: 'claim'; shift: QShift }>(null)
  const [pending, start] = useTransition()
  const close = () => setSheet(null)
  const jobName = new Map(jobs.map(j => [j.id, j.name]))
  const active = jobs.filter(j => j.active)
  const t = today()

  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>work</b></span>
        <span>this week {week.hours}h · {money(week.pay)}</span>
      </div>

      {jobs.length === 0 ? (
        <p className="q-empty">add a job to start logging shifts</p>
      ) : (
        <div className="q-chips">
          {active.map(j => (
            <Link key={j.id} href={`/q/job/${j.id}`} className="q-chip">
              {j.name} <span className="q-dim">{money(Number(j.wage))}/h</span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px', flexWrap: 'wrap' }}>
        {active.length > 0 && (
          <>
            <button className="q-btn is-primary is-small" onClick={() => setSheet({ kind: 'log' })}>+ log shift</button>
            <button className="q-btn is-small" onClick={() => setSheet({ kind: 'plan' })}>+ plan shift</button>
          </>
        )}
        <button className="q-btn is-small" onClick={() => setSheet({ kind: 'job' })}>+ job</button>
      </div>

      {planned.length > 0 && (
        <>
          <div className="q-tiny q-dim" style={{ padding: '4px 12px' }}>planned · claim once worked</div>
          {planned.map(s => (
            <div key={s.id} className="q-row">
              <span className="q-row-main">
                <span className="q-row-title">{jobName.get(s.job_id)}</span>
                <span className="q-row-sub">
                  {formatDow(s.worked_on)} {formatShort(s.worked_on)} · {relativeDay(s.worked_on, t)}
                  {s.location ? ` · ${s.location}` : ''}
                </span>
              </span>
              <button
                className={`q-btn is-small ${s.worked_on <= t ? 'is-primary' : ''}`}
                onClick={() => setSheet({ kind: 'claim', shift: s })}
              >
                claim
              </button>
              <button
                className="q-faint"
                style={{ padding: '0 6px' }}
                disabled={pending}
                aria-label="delete"
                onClick={() => confirm('delete planned shift?') && start(async () => {
                  try { unwrap(await deleteShift(s.id)) } catch (e) { toast(`✕ ${e instanceof Error ? e.message : 'failed'}`) }
                })}
              >
                ✕
              </button>
            </div>
          ))}
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="q-tiny q-dim" style={{ padding: '8px 12px 4px' }}>recent</div>
          {recent.map(s => (
            <Link key={s.id} href={`/q/job/${s.job_id}`} className="q-row" style={{ minHeight: 44 }}>
              <span className="q-row-main">
                <span className="q-row-title">{jobName.get(s.job_id)} · {s.hours}h</span>
                <span className="q-row-sub">{relativeDay(s.worked_on, t)}{s.location ? ` · ${s.location}` : ''}</span>
              </span>
              <span className="q-small">{money(Number(s.hours ?? 0) * Number(s.wage ?? 0))}</span>
            </Link>
          ))}
        </>
      )}

      <Sheet
        open={sheet !== null}
        onClose={close}
        title={!sheet ? '' : sheet.kind === 'job' ? 'new job' : sheet.kind === 'claim' ? 'claim shift' : sheet.kind === 'plan' ? 'plan a shift' : 'log a shift'}
      >
        {sheet?.kind === 'job' && <JobForm onDone={close} />}
        {(sheet?.kind === 'log' || sheet?.kind === 'plan') && (
          <ShiftForm jobs={active} mode={sheet.kind} locations={locations} onDone={close} />
        )}
        {sheet?.kind === 'claim' && (
          <ShiftForm jobs={jobs} mode="claim" shift={sheet.shift} locations={locations} onDone={close} />
        )}
      </Sheet>
    </section>
  )
}

/** Today: planned shifts whose day has come, ready to claim. */
export function ClaimShifts({ shifts, jobs, locations }: { shifts: QShift[]; jobs: QJob[]; locations: Record<string, string[]> }) {
  const [claiming, setClaiming] = useState<QShift | null>(null)
  const jobName = new Map(jobs.map(j => [j.id, j.name]))
  if (!shifts.length) return null
  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>shifts to claim</b></span></div>
      {shifts.map(s => (
        <div key={s.id} className="q-row" data-d="admn">
          <span className="q-dot" />
          <span className="q-row-main">
            <span className="q-row-title">{jobName.get(s.job_id)}</span>
            <span className="q-row-sub">{relativeDay(s.worked_on)}{s.location ? ` · ${s.location}` : ''}</span>
          </span>
          <button className="q-btn is-small is-primary" onClick={() => setClaiming(s)}>claim</button>
        </div>
      ))}
      <Sheet open={!!claiming} onClose={() => setClaiming(null)} title="claim shift">
        {claiming && <ShiftForm jobs={jobs} mode="claim" shift={claiming} locations={locations} onDone={() => setClaiming(null)} />}
      </Sheet>
    </section>
  )
}
