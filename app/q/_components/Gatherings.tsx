'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import type { QEvent } from '@/lib/q/types'
import { formatDow, formatShort, relativeDay, today } from '@/lib/q/time'
import { EVENT_VALUE, HANG_VALUE } from '@/lib/q/points'
import { unwrap } from '@/lib/q/act'
import { completeEvent, deleteEvent, reopenEvent, saveGathering, skipEvent } from '../plan/actions'
import CheckRow from './CheckRow'
import QForm from './Form'
import Sheet from './Sheet'
import { TagInput } from './log/inputs'
import { toast } from './Toast'

type Person = { id: string; name: string }
type Org = { id: string; name: string }
export type GatheringRow = QEvent & {
  people: (Person & { note: string | null })[]
  org: Org | null
}
type Kind = 'hang' | 'event'

const WORD: Record<Kind, string> = { hang: 'hang', event: 'event' }

// ── people + a note per person ──────────────────────────────

function PeopleNotes({ people, initial }: { people: Person[]; initial: GatheringRow['people'] }) {
  const [picked, setPicked] = useState<{ id: string | null; name: string; note: string }[]>(
    initial.map(p => ({ id: p.id, name: p.name, note: p.note ?? '' })),
  )
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const taken = new Set(picked.map(p => p.name.toLowerCase()))
  const matches = query ? people.filter(p => p.name.toLowerCase().includes(query) && !taken.has(p.name.toLowerCase())).slice(0, 6) : []
  const exact = taken.has(query) || people.some(p => p.name.toLowerCase() === query)

  const add = (p: { id: string | null; name: string }) => {
    setPicked([...picked, { ...p, note: '' }])
    setQ('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="people_ids" value={JSON.stringify(picked.filter(p => p.id).map(p => p.id))} />
      <input type="hidden" name="new_people" value={JSON.stringify(picked.filter(p => !p.id).map(p => p.name))} />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="add someone"
        enterKeyHint="done"
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (matches[0]) add(matches[0])
          else if (query && !exact) add({ id: null, name: q.trim() })
        }}
      />
      {(matches.length > 0 || (query && !exact)) && (
        <div className="q-seg">
          {matches.map(p => <button key={p.id} type="button" onClick={() => add(p)}>{p.name}</button>)}
          {query && !exact && <button type="button" onClick={() => add({ id: null, name: q.trim() })}>+ new “{q.trim()}”</button>}
        </div>
      )}
      {picked.map((p, i) => (
        <div key={p.id ?? p.name} className="q-person-note">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="q-pos" style={{ fontSize: 14 }}>{p.name}{!p.id && <span className="q-faint"> · new</span>}</span>
            <button type="button" className="q-faint" onClick={() => setPicked(picked.filter((_, j) => j !== i))}>remove</button>
          </div>
          <textarea
            name={p.id ? `note_${p.id}` : `note_new_${p.name}`}
            rows={2}
            value={p.note}
            onChange={e => setPicked(picked.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
            placeholder={`anything new with ${p.name}? (added to their file)`}
          />
        </div>
      ))}
    </div>
  )
}

// ── the form ────────────────────────────────────────────────

export function GatheringForm({
  kind,
  item,
  people,
  orgs,
  tags,
  onDone,
}: {
  kind: Kind
  item?: GatheringRow
  people: Person[]
  orgs: Org[]
  tags: string[]
  onDone: () => void
}) {
  const t = today()
  const [day, setDay] = useState(item?.happens_on ?? (item ? '' : t))
  const [happened, setHappened] = useState(item ? item.status === 'done' : true)
  const [orgId, setOrgId] = useState(item?.org_id ?? '')
  const future = !!day && day > t

  return (
    <QForm action={saveGathering.bind(null, item?.id ?? null)} onDone={onDone} submit={happened ? `log it · +${kind === 'hang' ? HANG_VALUE : EVENT_VALUE}` : 'add to upcoming'}>
      <input type="hidden" name="kind" value={kind} />
      <div className="q-seg">
        <button type="button" className={happened ? 'is-on' : ''} onClick={() => setHappened(true)} disabled={future}>it happened</button>
        <button type="button" className={!happened || future ? 'is-on' : ''} onClick={() => setHappened(false)}>upcoming</button>
      </div>
      {happened && !future && <input type="hidden" name="happened" value="on" />}

      <label className="q-field">
        {kind === 'hang' ? 'what we did' : 'event'}
        <textarea name="title" rows={2} required defaultValue={item?.title} placeholder={kind === 'hang' ? 'movie night' : 'strong towns meetup'} />
      </label>
      <label className="q-field">
        {happened ? 'day' : 'when (blank = someday)'}
        <input
          name="happens_on"
          type="date"
          value={day}
          onChange={e => {
            setDay(e.target.value)
            if (e.target.value > t) setHappened(false)
          }}
        />
      </label>

      {kind === 'event' && (
        <div className="q-field">
          organization
          <select value={orgId} onChange={e => setOrgId(e.target.value)} name={orgId === '__new' ? undefined : 'org_id'}>
            <option value="">— none —</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            <option value="__new">+ new organization…</option>
          </select>
          {orgId === '__new' && <input name="new_org" required placeholder="organization name" />}
          {orgId && <textarea name="org_note" rows={2} placeholder="notes for the organization’s file (optional)" />}
        </div>
      )}

      <div className="q-field">
        {kind === 'hang' ? 'who' : 'who was there'}
        <PeopleNotes people={people} initial={item?.people ?? []} />
      </div>
      <div className="q-field">
        tags
        <TagInput name="tags" suggestions={tags} initial={item?.tags ?? []} />
      </div>
      <label className="q-field">
        notes
        <textarea name="notes" rows={3} defaultValue={item?.notes ?? ''} />
      </label>
    </QForm>
  )
}

// ── the list ────────────────────────────────────────────────

export default function Gatherings({
  kind,
  items,
  people,
  orgs,
  tags,
  title,
  showRecent = true,
}: {
  kind: Kind
  items: GatheringRow[]
  people: Person[]
  orgs: Org[]
  tags: string[]
  title?: string
  showRecent?: boolean
}) {
  const [sheet, setSheet] = useState<'new' | GatheringRow | null>(null)
  const [pending, start] = useTransition()
  const close = () => setSheet(null)
  const t = today()
  const value = kind === 'hang' ? HANG_VALUE : EVENT_VALUE
  const upcoming = items
    .filter(x => x.status === 'planned')
    .sort((a, b) => (a.happens_on ?? '9999').localeCompare(b.happens_on ?? '9999'))
  const recent = items
    .filter(x => x.status === 'done')
    .sort((a, b) => (b.happens_on ?? '').localeCompare(a.happens_on ?? ''))
    .slice(0, 8)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try { unwrap(await fn()); close() } catch (e) { toast(`✕ ${e instanceof Error ? e.message : 'failed'}`) }
    })
  }

  const when = (x: GatheringRow) => {
    if (!x.happens_on) return <span>someday</span>
    if (x.status === 'planned' && x.happens_on < t) return <span className="q-neg">{relativeDay(x.happens_on, t)} · did it happen?</span>
    if (x.happens_on === t) return <span className="q-pos">today</span>
    return <span>{formatDow(x.happens_on)} {formatShort(x.happens_on)} · {relativeDay(x.happens_on, t)}</span>
  }

  const row = (x: GatheringRow) => (
    <CheckRow
      key={x.id}
      title={x.title}
      sub={
        <>
          {when(x)}
          {x.org && <span>@ {x.org.name}</span>}
          {x.people.length > 0 && <span>with {x.people.map(p => p.name).join(', ')}</span>}
        </>
      }
      value={value}
      domain={x.domain}
      done={x.status === 'done'}
      onToggle={on => (on ? completeEvent(x.id) : reopenEvent(x.id))}
      onOpen={() => setSheet(x)}
    />
  )

  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>{title ?? (kind === 'hang' ? 'hangs' : 'events')}</b></span>
        <button type="button" className="q-pos" onClick={() => setSheet('new')}>+ {WORD[kind]}</button>
      </div>
      {upcoming.length === 0 && recent.length === 0 && (
        <p className="q-empty">{kind === 'hang' ? 'log a hang or plan one' : 'log an event or plan one'}</p>
      )}
      {upcoming.length > 0 && (
        <>
          <div className="q-sub-head">upcoming · tick when it happens</div>
          {upcoming.map(row)}
        </>
      )}
      {showRecent && recent.length > 0 && (
        <>
          <div className="q-sub-head">recent</div>
          {recent.map(row)}
        </>
      )}

      <Sheet open={sheet !== null} onClose={close} title={sheet === 'new' ? `new ${WORD[kind]}` : `edit ${WORD[kind]}`}>
        {sheet === 'new' && <GatheringForm kind={kind} people={people} orgs={orgs} tags={tags} onDone={close} />}
        {sheet && sheet !== 'new' && (
          <>
            <GatheringForm kind={sheet.kind} item={sheet} people={people} orgs={orgs} tags={tags} onDone={close} />
            {sheet.org && (
              <Link href={`/q/org/${sheet.org.id}`} className="q-btn is-block" style={{ marginTop: 10 }}>open {sheet.org.name} →</Link>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {sheet.status === 'planned' && (
                <button className="q-btn" style={{ flex: 1 }} disabled={pending} onClick={() => run(() => skipEvent(sheet.id))}>
                  didn’t happen
                </button>
              )}
              <button
                className="q-btn is-danger"
                style={{ flex: 1 }}
                disabled={pending}
                onClick={() => confirm(`delete this ${WORD[sheet.kind]}?`) && run(() => deleteEvent(sheet.id))}
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
