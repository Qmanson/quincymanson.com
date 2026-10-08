'use client'

import { useState, useTransition } from 'react'
import type { QJob, QShift } from '@/lib/q/types'
import { formatDow, formatShort } from '@/lib/q/time'
import { unwrap } from '@/lib/q/act'
import Sheet from '../../_components/Sheet'
import { toast } from '../../_components/Toast'
import { JobForm, ShiftForm } from '../../_components/Work'
import { deleteShift, setJobActive } from '../../work/actions'

export default function JobActions({
  job,
  jobs,
  locations,
  planned,
}: {
  job: QJob
  jobs: QJob[]
  locations: Record<string, string[]>
  planned: QShift[]
}) {
  const [sheet, setSheet] = useState<null | 'log' | 'plan' | 'edit' | QShift>(null)
  const [pending, start] = useTransition()
  const close = () => setSheet(null)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try { unwrap(await fn()); close() } catch (e) { toast(`✕ ${e instanceof Error ? e.message : 'failed'}`) }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="q-btn is-primary" style={{ flex: 1 }} onClick={() => setSheet('log')}>+ log</button>
        <button className="q-btn" style={{ flex: 1 }} onClick={() => setSheet('plan')}>+ plan</button>
        <button className="q-btn" style={{ flex: 1 }} onClick={() => setSheet('edit')}>edit</button>
      </div>

      {planned.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>planned</b></span></div>
          {planned.map(s => (
            <div key={s.id} className="q-row">
              <span className="q-row-main">
                <span className="q-row-title">{formatDow(s.worked_on)} {formatShort(s.worked_on)}</span>
                <span className="q-row-sub">{s.location ?? '—'}</span>
              </span>
              <button className="q-btn is-small is-primary" onClick={() => setSheet(s)}>claim</button>
              <button className="q-faint" style={{ padding: '0 6px' }} disabled={pending} onClick={() => confirm('delete?') && run(() => deleteShift(s.id))}>✕</button>
            </div>
          ))}
        </section>
      )}

      <Sheet open={sheet !== null} onClose={close} title={sheet === 'edit' ? 'edit job' : sheet === 'plan' ? 'plan a shift' : sheet === 'log' ? 'log a shift' : 'claim shift'}>
        {sheet === 'edit' && (
          <>
            <JobForm job={job} onDone={close} />
            <button className="q-btn is-block" style={{ marginTop: 10 }} disabled={pending} onClick={() => run(() => setJobActive(job.id, !job.active))}>
              {job.active ? 'archive job' : 'unarchive job'}
            </button>
          </>
        )}
        {(sheet === 'log' || sheet === 'plan') && <ShiftForm jobs={jobs} mode={sheet} jobId={job.id} locations={locations} onDone={close} />}
        {sheet && typeof sheet === 'object' && <ShiftForm jobs={jobs} mode="claim" shift={sheet} locations={locations} onDone={close} />}
      </Sheet>
    </>
  )
}
