'use client'

import QForm from '../../_components/Form'
import { Seg } from '../../_components/Pickers'
import { REVIEW_BONUS } from '@/lib/q/points'
import type { ReviewCadence } from '@/lib/q/payday'
import { completeReview } from '../actions'

const PROMPTS: Record<ReviewCadence, { k: string; label: string; ph: string }[]> = {
  weekly: [
    { k: 'wins', label: 'wins', ph: 'what went well' },
    { k: 'misses', label: 'misses', ph: 'what slipped and why' },
    { k: 'next', label: 'next week', ph: 'calls to make, projects to push…' },
  ],
  monthly: [
    { k: 'wins', label: 'wins', ph: '' },
    { k: 'misses', label: 'misses', ph: '' },
    { k: 'next', label: 'projects & timelines', ph: 'arts / make updates' },
  ],
  quarterly: [
    { k: 'wins', label: 'what this quarter was', ph: '' },
    { k: 'next', label: 'missions for next quarter', ph: '' },
  ],
  yearly: [
    { k: 'wins', label: 'the year', ph: '' },
    { k: 'next', label: 'next year', ph: '' },
  ],
}

export default function ReviewForm({ cadence }: { cadence: ReviewCadence }) {
  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>reflect</b></span></div>
      <div className="q-panel-body">
        <QForm
          action={completeReview.bind(null, cadence)}
          submit={cadence === 'weekly' ? '$ complete & claim payday' : `complete · +${REVIEW_BONUS[cadence]}`}
        >
          {cadence === 'monthly' && (
            <div className="q-field">
              budget grade
              <Seg name="grade" options={['A', 'B', 'C', 'D', 'F'].map(g => ({ value: g, label: g }))} />
            </div>
          )}
          {PROMPTS[cadence].map(p => (
            <label key={p.k} className="q-field">
              {p.label}
              <textarea name={p.k} rows={2} placeholder={p.ph} />
            </label>
          ))}
          <label className="q-field">
            notes
            <textarea name="notes" rows={3} />
          </label>
        </QForm>
      </div>
    </section>
  )
}
