'use client'

import type { QWorkout } from '@/lib/q/types'
import QForm from '../../_components/Form'
import { updateWorkout } from '../../actions'

export default function WorkoutSettings({ workout: w }: { workout: QWorkout }) {
  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>settings</b></span></div>
      <div className="q-panel-body">
        <QForm action={updateWorkout.bind(null, w.id)} submit="save">
          <label className="q-field">name<input name="name" defaultValue={w.name} required /></label>
          <div className="q-form-row">
            <label className="q-field">
              your max (1 rep)
              <input name="max_weight" type="number" inputMode="decimal" step="any" defaultValue={w.max_weight ?? ''} placeholder="—" />
            </label>
            <label className="q-field">
              Q$ per rep
              <input name="value_per_rep" type="number" inputMode="decimal" step="any" defaultValue={w.value_per_rep} />
            </label>
          </div>
          <p className="q-small q-dim">
            each set pays reps × Q$/rep × (weight ÷ max). 3×8 at 150 on a 200 max with 1 Q$/rep = 18 Q$.
          </p>
        </QForm>
      </div>
    </section>
  )
}
