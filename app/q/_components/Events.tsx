'use client'

import { useState, useTransition } from 'react'
import type { Domain, QEvent } from '@/lib/q/types'
import { formatDow, formatShort, relativeDay } from '@/lib/q/time'
import { unwrap } from '@/lib/q/act'
import { createEvent, completeEvent, deleteEvent, skipEvent, updateEvent } from '../plan/actions'
import CheckRow from './CheckRow'
import QForm from './Form'
import Sheet from './Sheet'
import { DomainPicker } from './Pickers'
import { PeoplePicker } from './log/inputs'
import { toast } from './Toast'

export type EventRow = QEvent & { people: { id: string; name: string }[] }
type Person = { id: string; name: string }

export function EventForm({
  ev,
  people,
  domain,
  onDone,
}: {
  ev?: EventRow
  people: Person[]
  domain?: Domain
  onDone: () => void
}) {
  return (
    <QForm action={ev ? updateEvent.bind(null, ev.id) : createEvent} onDone={onDone}>
      <label className="q-field">
        what
        <textarea name="title" rows={2} required defaultValue={ev?.title} placeholder="december solstice dinner" />
      </label>
      <label className="q-field">
        when (blank = someday)
        <input name="happens_on" type="date" defaultValue={ev?.happens_on ?? ''} />
      </label>
      <div className="q-field">
        who’s coming
        <PeoplePicker people={people} initial={ev?.people.map(p => p.id)} />
      </div>
      <DomainPicker initial={ev?.domain ?? domain ?? 'crew'} />
      <label className="q-field">
        notes
        <textarea name="notes" rows={2} defaultValue={ev?.notes ?? ''} />
      </label>
    </QForm>
  )
}

/** Upcoming events — tick one when it happens to log it with its people. */
export default function Events({
  events,
  people,
  domain,
  value,
  today: t,
}: {
  events: EventRow[]
  people: Person[]
  domain?: Domain
  /** Q$ an event log pays */
  value: number
  today: string
}) {
  const [sheet, setSheet] = useState<'new' | EventRow | null>(null)
  const [pending, start] = useTransition()
  const close = () => setSheet(null)
  const sorted = [...events].sort((a, b) => (a.happens_on ?? '9999').localeCompare(b.happens_on ?? '9999'))

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try { unwrap(await fn()); close() } catch (e) { toast(`✕ ${e instanceof Error ? e.message : 'failed'}`) }
    })
  }

  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>events</b></span>
        <button type="button" className="q-pos" onClick={() => setSheet('new')}>+ event</button>
      </div>
      {sorted.length === 0 && <p className="q-empty">nothing queued — add dinners, shows, trips</p>}
      {sorted.map(ev => (
        <CheckRow
          key={ev.id}
          title={ev.title}
          sub={
            <>
              <span className={ev.happens_on && ev.happens_on < t ? 'q-neg' : ev.happens_on === t ? 'q-pos' : ''}>
                {ev.happens_on ? `${formatDow(ev.happens_on)} ${formatShort(ev.happens_on)} · ${relativeDay(ev.happens_on, t)}` : 'someday'}
              </span>
              {ev.people.length > 0 && <span>with {ev.people.map(p => p.name).join(', ')}</span>}
            </>
          }
          value={value}
          domain={ev.domain}
          done={false}
          oneWay
          onToggle={completeEvent.bind(null, ev.id)}
          onMore={() => setSheet(ev)}
        />
      ))}

      <Sheet open={sheet !== null} onClose={close} title={sheet === 'new' ? 'new event' : 'edit event'}>
        {sheet === 'new' && <EventForm people={people} domain={domain} onDone={close} />}
        {sheet && sheet !== 'new' && (
          <>
            <EventForm ev={sheet} people={people} onDone={close} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="q-btn" style={{ flex: 1 }} disabled={pending} onClick={() => run(() => skipEvent(sheet.id))}>
                didn’t happen
              </button>
              <button
                className="q-btn is-danger"
                style={{ flex: 1 }}
                disabled={pending}
                onClick={() => confirm('delete event?') && run(() => deleteEvent(sheet.id))}
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
