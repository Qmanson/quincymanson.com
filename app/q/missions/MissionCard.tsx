'use client'

import { useState, useTransition } from 'react'
import type { QMission } from '@/lib/q/types'
import type { MissionView } from '@/lib/q/missions'
import { formatQ } from '@/lib/q/points'
import Sheet from '../_components/Sheet'
import QForm from '../_components/Form'
import { toast } from '../_components/Toast'
import { unwrap } from '@/lib/q/act'
import {
  abandonMission,
  addSlip,
  checkIn,
  completeMission,
  deleteMission,
  startMission,
  toggleStep,
  undoCheckIn,
} from './actions'

const KIND_LABEL: Record<QMission['kind'], string> = {
  checklist: 'checklist',
  deadline: 'deadline',
  speed: 'speed run',
  streak: 'streak',
  target: 'target',
  abstain: 'abstain',
}

export default function MissionCard({ m, v, compact }: { m: QMission; v?: MissionView; compact?: boolean }) {
  const [pending, start] = useTransition()
  const [sheet, setSheet] = useState<null | 'add' | 'slip'>(null)
  const close = () => setSheet(null)

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try {
        const r = unwrap(await fn())
        if (typeof r === 'number') toast(r)
      } catch (e) {
        toast(e instanceof Error ? `✕ ${e.message}` : '✕ failed')
      }
    })
  }

  const active = m.status === 'active'
  const finished = m.status === 'passed' || m.status === 'failed' || m.status === 'abandoned'

  return (
    <div className="q-panel" data-d={m.domain} style={{ borderLeft: '3px solid var(--d)' }}>
      <div className="q-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="q-tiny" style={{ display: 'flex', gap: 8 }}>
              <span className="q-tag">{m.domain}</span>
              <span className="q-dim">{KIND_LABEL[m.kind]}</span>
              {m.theme_id && <span className="q-pos">✦ theme</span>}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{m.title}</div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="q-value">{finished ? formatQ(m.payout ?? 0) : formatQ(v?.payoutNow ?? m.reward)}</div>
            <div className="q-tiny q-faint">{finished ? m.status : active ? 'if done now' : 'reward'}</div>
          </div>
        </div>

        {active && v && (
          <>
            <div className="q-bar"><i style={{ width: `${Math.round(v.pct * 100)}%` }} /></div>
            <div className="q-small q-dim" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{v.label}</span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {v.daysLeft !== null && <span>{v.daysLeft >= 0 ? `${v.daysLeft}d left` : 'ended'}</span>}
                <span className="q-strikes" title={`${v.strikes}/${m.strike_limit} strikes`}>
                  {Array.from({ length: m.strike_limit }, (_, i) => <i key={i} className={i < v.strikes ? 'is-on' : ''} />)}
                </span>
              </span>
            </div>
          </>
        )}

        {!compact && active && v && v.steps.length > 0 && (
          <div style={{ margin: '0 -12px' }}>
            {v.steps.map(s => (
              <button
                key={s.id}
                type="button"
                className={`q-row ${s.done ? 'is-done' : ''}`}
                style={{ minHeight: 44 }}
                disabled={pending}
                onClick={() => run(() => toggleStep(s.id, !s.done))}
              >
                <span className="q-box">{s.done ? '✓' : ''}</span>
                <span className="q-row-main"><span className="q-row-title" style={{ display: 'block' }}>{s.title}</span></span>
              </button>
            ))}
          </div>
        )}

        {!compact && m.notes && <p className="q-small q-dim">{m.notes}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {m.status === 'planned' && (
            <>
              <button className="q-btn is-primary is-small" disabled={pending} onClick={() => run(() => startMission(m.id))}>▶ start</button>
              {!compact && (
                <button className="q-btn is-small" disabled={pending} onClick={() => confirm('delete this mission?') && run(() => deleteMission(m.id))}>delete</button>
              )}
            </>
          )}

          {active && m.kind === 'streak' && (
            v?.checkedToday ? (
              <button className="q-btn is-small" disabled={pending} onClick={() => run(() => undoCheckIn(m.id))}>✓ checked today · undo</button>
            ) : (
              <button className="q-btn is-primary is-small" disabled={pending} onClick={() => run(() => checkIn(m.id))}>check in today</button>
            )
          )}

          {active && m.kind === 'target' && (
            <button className="q-btn is-primary is-small" onClick={() => setSheet('add')}>+ progress</button>
          )}

          {active && (m.kind === 'checklist' || m.kind === 'deadline' || m.kind === 'speed') && !compact && (
            <button
              className="q-btn is-primary is-small"
              disabled={pending}
              onClick={() => confirm('mark this mission complete?') && run(() => completeMission(m.id))}
            >
              ★ complete
            </button>
          )}

          {active && (
            <button className="q-btn is-small" onClick={() => setSheet('slip')}>
              {m.kind === 'abstain' ? '✕ slipped' : '+ strike'}
            </button>
          )}

          {active && !compact && (
            <button
              className="q-btn is-danger is-small"
              disabled={pending}
              onClick={() => confirm('abandon? no payout.') && run(() => abandonMission(m.id))}
            >
              abandon
            </button>
          )}
        </div>
      </div>

      <Sheet open={sheet === 'add'} onClose={close} title="add progress">
        <QForm action={f => checkIn(m.id, f)} onDone={close}>
          <label className="q-field">
            amount
            <input name="amount" type="number" inputMode="decimal" step="any" required autoFocus />
          </label>
          {m.target_log_type_id && <p className="q-small q-dim">logs of the linked type count automatically.</p>}
          <label className="q-field">note<input name="note" /></label>
        </QForm>
      </Sheet>

      <Sheet open={sheet === 'slip'} onClose={close} title={m.kind === 'abstain' ? 'log a slip' : 'add a strike'}>
        <p className="q-small q-dim" style={{ marginBottom: 12 }}>
          {m.strike_limit - (v?.strikes ?? 0) - 1 <= 0
            ? 'this will fail the mission.'
            : `${m.strike_limit - (v?.strikes ?? 0) - 1} strike(s) left after this.`}
        </p>
        <QForm action={f => addSlip(m.id, f)} onDone={close} submit="add strike">
          <label className="q-field">what happened<input name="note" /></label>
        </QForm>
      </Sheet>
    </div>
  )
}
