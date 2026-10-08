'use client'

import type { QTheme } from '@/lib/q/types'
import QForm from '../../_components/Form'
import { setTheme } from '../actions'

export default function ThemeForm({ scope, current }: { scope: 'year' | 'quarter'; current: QTheme | null }) {
  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>{scope === 'year' ? 'yearly theme' : 'quarter sub-theme'}</b></span>
        {current && <span className="q-pos">✦ {current.title}</span>}
      </div>
      <div className="q-panel-body">
        <QForm action={setTheme.bind(null, scope)} submit={current ? 'update theme' : 'set theme'}>
          <label className="q-field">
            theme
            <input name="title" defaultValue={current?.title ?? ''} required />
          </label>
          <label className="q-field">
            what it means
            <textarea name="notes" rows={2} defaultValue={current?.notes ?? ''} />
          </label>
        </QForm>
      </div>
    </section>
  )
}
