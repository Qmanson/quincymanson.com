'use client'

import { useState } from 'react'
import type { MissionKind, QLogType } from '@/lib/q/types'
import Sheet from '../_components/Sheet'
import QForm from '../_components/Form'
import { DomainPicker, Seg } from '../_components/Pickers'
import { createMission } from './actions'

const KIND_OPTS: { value: MissionKind; label: string; hint: string }[] = [
  { value: 'streak', label: 'streak', hint: 'check in on a schedule — each missed day/week is a strike' },
  { value: 'target', label: 'target', hint: 'hit a total — pays the share you reach' },
  { value: 'checklist', label: 'checklist', hint: 'tick off steps, no clock' },
  { value: 'deadline', label: 'deadline', hint: 'done by a date or it fails' },
  { value: 'speed', label: 'speed run', hint: 'faster = more Q$' },
  { value: 'abstain', label: 'abstain', hint: 'avoid something — log slips as strikes' },
]

export default function NewMission({
  logTypes,
  periods,
}: {
  logTypes: QLogType[]
  periods: { month: [string, string]; quarter: [string, string] }
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<MissionKind>('streak')
  const [period, setPeriod] = useState<'month' | 'quarter'>('month')
  const [formula, setFormula] = useState<'halving' | 'linear' | 'custom'>('halving')
  const close = () => setOpen(false)
  const labels = periods[period]

  return (
    <>
      <button className="q-btn is-primary is-block" onClick={() => setOpen(true)}>+ plan a mission</button>
      <Sheet open={open} onClose={close} title="plan a mission">
        <QForm action={createMission} onDone={close} submit="plan it">
          <label className="q-field">
            mission
            <input name="title" required placeholder="run every day for a week" />
          </label>
          <DomainPicker />

          <div className="q-form-row">
            <div className="q-field">
              for the
              <Seg name="period" initial={period} options={[{ value: 'month', label: 'month' }, { value: 'quarter', label: 'quarter' }]} onChange={setPeriod} />
            </div>
            <div className="q-field">
              which
              <Seg name="which" initial="this" options={[{ value: 'this', label: labels[0] }, { value: 'next', label: labels[1] }]} />
            </div>
          </div>

          <div className="q-field">
            type
            <Seg name="kind" initial={kind} options={KIND_OPTS} onChange={setKind} />
            <span className="q-small q-dim" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {KIND_OPTS.find(k => k.value === kind)?.hint}
            </span>
          </div>

          {kind === 'streak' && (
            <>
              <div className="q-form-row">
                <div className="q-field">
                  check in
                  <Seg name="streak_cadence" initial="daily" options={[{ value: 'daily', label: 'daily' }, { value: 'weekly', label: 'weekly' }]} />
                </div>
                <label className="q-field">
                  times per period
                  <input name="streak_per_period" type="number" inputMode="numeric" min={1} defaultValue={1} />
                </label>
              </div>
              <label className="q-field">
                length (days)
                <input name="duration_days" type="number" inputMode="numeric" min={1} defaultValue={7} required />
              </label>
            </>
          )}

          {kind === 'abstain' && (
            <label className="q-field">
              length (days)
              <input name="duration_days" type="number" inputMode="numeric" min={1} defaultValue={14} required />
            </label>
          )}

          {kind === 'target' && (
            <>
              <label className="q-field">
                target amount
                <input name="target_amount" type="number" inputMode="decimal" step="any" required placeholder="50" />
              </label>
              <label className="q-field">
                count logs of (optional)
                <select name="target_log_type_id" defaultValue="">
                  <option value="">— none, add progress by hand —</option>
                  {logTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}{lt.unit ? ` (${lt.unit})` : ''}</option>
                  ))}
                </select>
              </label>
              <label className="q-field">
                ends (blank = end of period)
                <input name="due_on" type="date" />
              </label>
            </>
          )}

          {kind === 'deadline' && (
            <label className="q-field">
              due
              <input name="due_on" type="date" required />
            </label>
          )}

          {kind === 'speed' && (
            <label className="q-field">
              tiers — days:Q$, blank days = any time
              <input name="speed_tiers" defaultValue="7:1000, 14:700, :400" />
            </label>
          )}

          {(kind === 'checklist' || kind === 'deadline' || kind === 'speed') && (
            <label className="q-field">
              steps (one per line)
              <textarea name="steps" rows={4} placeholder={'buy wood\ncut pieces\nassemble'} />
            </label>
          )}

          {kind !== 'speed' && (
            <label className="q-field">
              reward Q$
              <input name="reward" type="number" inputMode="numeric" defaultValue={1000} />
            </label>
          )}

          <div className="q-panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="q-tiny q-dim">strikes</div>
            <div className="q-form-row">
              <label className="q-field">
                limit (fail at)
                <input name="strike_limit" type="number" inputMode="numeric" min={1} defaultValue={3} />
              </label>
              <div className="q-field">
                each strike
                <Seg
                  name="strike_formula"
                  initial={formula}
                  onChange={setFormula}
                  options={[{ value: 'halving', label: '½' }, { value: 'linear', label: '−%' }, { value: 'custom', label: 'table' }]}
                />
              </div>
            </div>
            {formula === 'halving' && <p className="q-small q-dim">1000 → 500 → 250 → fail</p>}
            {formula === 'linear' && (
              <label className="q-field">
                % lost per strike
                <input name="strike_linear_pct" type="number" inputMode="numeric" defaultValue={25} />
              </label>
            )}
            {formula === 'custom' && (
              <label className="q-field">
                payout at 0, 1, 2… strikes
                <input name="strike_table" placeholder="1000, 800, 400" />
              </label>
            )}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="q-small">
            <input type="checkbox" name="themed" /> part of this period’s theme (×1.25)
          </label>

          <label className="q-field">
            notes
            <textarea name="notes" rows={2} />
          </label>
        </QForm>
      </Sheet>
    </>
  )
}
