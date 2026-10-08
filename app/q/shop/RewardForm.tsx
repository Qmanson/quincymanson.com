'use client'

import { useState } from 'react'
import type { QReward } from '@/lib/q/types'
import { formatQ } from '@/lib/q/points'
import { toCrop } from '@/lib/q/crop'
import QForm from '../_components/Form'
import { DomainPicker, Seg } from '../_components/Pickers'
import { PhotoInput } from '../_components/log/inputs'
import { createReward, updateReward } from './actions'

export const CATS = [
  { value: 'want', label: 'wants' },
  { value: 'treat', label: 'treats' },
  { value: 'experience', label: 'experiences' },
  { value: 'other', label: 'other' },
] as const

export default function RewardForm({
  r,
  rate: initialRate,
  imageSrc,
  onDone,
}: {
  r?: QReward
  rate: number
  imageSrc?: string | null
  onDone: () => void
}) {
  const [usd, setUsd] = useState(r?.usd_price != null ? String(r.usd_price) : '')
  const [rate, setRate] = useState(String(initialRate))
  const [link, setLink] = useState(r?.image_url ?? '')
  const usdN = Number(usd)
  const rateN = Number(rate)
  const hasUsd = usd !== '' && usdN > 0
  const preview = hasUsd && rateN > 0 ? Math.round(usdN * rateN) : null
  const rateChanged = rateN > 0 && rateN !== initialRate

  return (
    <QForm action={r ? updateReward.bind(null, r.id) : createReward} onDone={onDone}>
      <PhotoInput
        name="image_path"
        cropName="image_crop"
        folder="shop"
        aspect="1 / 1"
        initialUrl={imageSrc}
        initialCrop={r ? toCrop(r.image_crop) : null}
        fallbackUrl={/^https?:\/\//.test(link) ? link : null}
      />
      <label className="q-field">
        or paste an image link
        <input name="image_url" type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…jpg" />
      </label>
      <label className="q-field">
        what
        <input name="title" required defaultValue={r?.title} placeholder="seiko 5" />
      </label>
      <div className="q-panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="q-form-row">
          <label className="q-field">
            real price $
            <input name="usd_price" type="number" inputMode="decimal" step="0.01" min="0" value={usd} onChange={e => setUsd(e.target.value)} placeholder="129.99" />
          </label>
          <label className="q-field">
            rate · Q$ per $1
            <input name="rate" type="number" inputMode="decimal" step="any" min="0" value={rate} onChange={e => setRate(e.target.value)} />
          </label>
        </div>
        {hasUsd ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="q-tiny q-dim">costs</span>
            <span className="q-price">Q$ {preview !== null ? formatQ(preview) : '—'}</span>
          </div>
        ) : (
          <label className="q-field">
            or set Q$ directly
            <input name="cost" type="number" inputMode="numeric" required defaultValue={r?.usd_price == null ? r?.cost : undefined} placeholder="5000" />
          </label>
        )}
        {rateChanged && (
          <p className="q-small" style={{ color: 'var(--warn)' }}>
            saving reprices everything with a $ price at {rate} Q$ per $1
          </p>
        )}
      </div>
      <label className="q-field">
        cooldown days
        <input name="cooldown_days" type="number" inputMode="numeric" defaultValue={r?.cooldown_days ?? ''} placeholder="— (repeatables only)" />
      </label>
      <div className="q-field">
        kind
        <Seg name="category" initial={r?.category ?? 'want'} options={CATS} />
      </div>
      <DomainPicker initial={r?.domain ?? undefined} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="q-small">
        <input type="checkbox" name="repeatable" defaultChecked={r?.repeatable} /> can buy more than once
      </label>
      <label className="q-field">
        store link
        <input name="url" type="url" defaultValue={r?.url ?? ''} placeholder="https://" />
      </label>
      <label className="q-field">
        notes
        <textarea name="notes" rows={2} defaultValue={r?.notes ?? ''} />
      </label>
    </QForm>
  )
}
