'use client'

import type { QReward } from '@/lib/q/types'
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

export default function RewardForm({ r, imageSrc, onDone }: { r?: QReward; imageSrc?: string | null; onDone: () => void }) {
  return (
    <QForm action={r ? updateReward.bind(null, r.id) : createReward} onDone={onDone}>
      <PhotoInput name="image_path" folder="shop" initialUrl={imageSrc} />
      <label className="q-field">
        or paste an image link
        <input name="image_url" type="url" defaultValue={r?.image_url ?? ''} placeholder="https://…jpg" />
      </label>
      <label className="q-field">
        what
        <input name="title" required defaultValue={r?.title} placeholder="seiko 5" />
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
