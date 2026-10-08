'use client'

import { useState, useTransition } from 'react'
import type { QReward } from '@/lib/q/types'
import { formatQ } from '@/lib/q/points'
import Sheet from '../_components/Sheet'
import QForm from '../_components/Form'
import { DomainPicker, Seg } from '../_components/Pickers'
import { toast } from '../_components/Toast'
import { buyReward, createReward, retireReward, updateReward } from './actions'

const CATS = [
  { value: 'want', label: 'wants' },
  { value: 'treat', label: 'treats' },
  { value: 'experience', label: 'experiences' },
  { value: 'other', label: 'other' },
] as const

function RewardForm({ r, onDone }: { r?: QReward; onDone: () => void }) {
  return (
    <QForm action={r ? updateReward.bind(null, r.id) : createReward} onDone={onDone}>
      <label className="q-field">
        what
        <input name="title" required defaultValue={r?.title} placeholder="seiko 5" autoFocus={!r} />
      </label>
      <div className="q-form-row">
        <label className="q-field">
          price Q$
          <input name="cost" type="number" inputMode="numeric" required defaultValue={r?.cost} placeholder="5000" />
        </label>
        <label className="q-field">
          cooldown days
          <input name="cooldown_days" type="number" inputMode="numeric" defaultValue={r?.cooldown_days ?? ''} placeholder="—" />
        </label>
      </div>
      <label className="q-field">
        kind
        <Seg name="category" initial={r?.category ?? 'want'} options={CATS} />
      </label>
      <DomainPicker initial={r?.domain ?? undefined} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="q-small">
        <input type="checkbox" name="repeatable" defaultChecked={r?.repeatable} /> can buy more than once
      </label>
      <label className="q-field">
        link
        <input name="url" type="url" defaultValue={r?.url ?? ''} placeholder="https://" />
      </label>
      <label className="q-field">
        notes
        <textarea name="notes" rows={2} defaultValue={r?.notes ?? ''} />
      </label>
    </QForm>
  )
}

export default function ShopList({ rewards, balance }: { rewards: QReward[]; balance: number }) {
  const [sheet, setSheet] = useState<'new' | QReward | null>(null)
  const [pending, start] = useTransition()
  const close = () => setSheet(null)
  const locked = balance < 0

  function buy(r: QReward) {
    if (!confirm(`spend ${formatQ(r.cost)} Q$ on ${r.title}?`)) return
    start(async () => {
      try { toast(await buyReward(r.id)) } catch (e) { toast(e instanceof Error ? `✕ ${e.message}` : '✕ failed') }
    })
  }

  return (
    <>
      <button className="q-btn is-primary is-block" onClick={() => setSheet('new')}>+ add to shop</button>
      {locked && <p className="q-neg q-small" style={{ textAlign: 'center' }}>⚠ shop locked — balance is negative</p>}

      {CATS.map(cat => {
        const items = rewards.filter(r => r.category === cat.value && r.status === 'available')
        if (!items.length) return null
        return (
          <section key={cat.value} className="q-panel">
            <div className="q-panel-title"><span>▸ <b>{cat.label}</b></span><span>{items.length}</span></div>
            {items.map(r => {
              const pct = Math.max(0, Math.min(1, balance / r.cost))
              const affordable = !locked && balance >= r.cost
              return (
                <div key={r.id} className="q-row" data-d={r.domain ?? undefined} style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="q-row-main" style={{ textAlign: 'left' }} onClick={() => setSheet(r)}>
                    <span className="q-row-title" style={{ display: 'block' }}>{r.title}</span>
                    <span className="q-row-sub" style={{ display: 'flex', gap: 8 }}>
                      {r.domain && <span className="q-tag">{r.domain}</span>}
                      {r.repeatable && <span>↻{r.cooldown_days ? ` ${r.cooldown_days}d` : ''}</span>}
                      {!affordable && !locked && <span>{Math.round(pct * 100)}% there</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`q-btn is-small ${affordable ? 'is-primary' : ''}`}
                    disabled={!affordable || pending}
                    onClick={() => buy(r)}
                  >
                    Q$ {formatQ(r.cost)}
                  </button>
                  {!affordable && (
                    <div className="q-bar" style={{ flexBasis: '100%', height: 3 }}><i style={{ width: `${pct * 100}%` }} /></div>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}

      {rewards.some(r => r.status === 'bought') && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>earned</b></span></div>
          {rewards.filter(r => r.status === 'bought').map(r => (
            <div key={r.id} className="q-row is-done" style={{ minHeight: 44 }}>
              <span className="q-row-main"><span className="q-row-title" style={{ display: 'block' }}>{r.title}</span></span>
              <span className="q-value">{formatQ(r.cost)}</span>
            </div>
          ))}
        </section>
      )}

      <Sheet open={sheet !== null} onClose={close} title={sheet === 'new' ? 'add to shop' : 'edit'}>
        {sheet === 'new' && <RewardForm onDone={close} />}
        {sheet && sheet !== 'new' && (
          <>
            <RewardForm r={sheet} onDone={close} />
            {sheet.url && (
              <a className="q-btn is-block" style={{ marginTop: 10 }} href={sheet.url} target="_blank" rel="noreferrer">open link ↗</a>
            )}
            <button
              className="q-btn is-danger is-block"
              style={{ marginTop: 10 }}
              disabled={pending}
              onClick={() => confirm('remove from shop?') && start(async () => { await retireReward(sheet.id); close() })}
            >
              remove
            </button>
          </>
        )}
      </Sheet>
    </>
  )
}
