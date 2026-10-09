'use client'

import { useState } from 'react'
import { appendNote, saveOrg, savePerson } from '../plan/actions'
import QForm from './Form'
import Sheet from './Sheet'
import { Seg } from './Pickers'

/**
 * A person's / org's file. Quick notes land at the bottom (dated); "edit"
 * opens the whole thing to reorganize.
 */
export default function FileEditor({
  kind,
  id,
  name,
  notes,
  extra,
}: {
  kind: 'person' | 'org'
  id: string
  name: string
  notes: string | null
  extra: { circle?: string; birthday?: string | null; url?: string | null }
}) {
  const [editing, setEditing] = useState(false)
  const [quick, setQuick] = useState(0)
  const close = () => setEditing(false)

  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>file</b></span>
        <button type="button" className="q-pos" onClick={() => setEditing(true)}>edit</button>
      </div>
      <div className="q-panel-body" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55 }}>
        {notes?.trim() ? notes : <span className="q-faint">empty — notes from hangs/events land here</span>}
      </div>
      <div className="q-panel-body" style={{ borderTop: '1px dashed var(--line)' }}>
        <QForm key={quick} action={appendNote.bind(null, kind, id)} onDone={() => setQuick(q => q + 1)} submit="add to bottom">
          <textarea name="note" rows={2} required placeholder="quick note…" />
        </QForm>
      </div>

      <Sheet open={editing} onClose={close} title={`edit ${name}`}>
        <QForm action={(kind === 'person' ? savePerson : saveOrg).bind(null, id)} onDone={close}>
          <label className="q-field">name<input name="name" required defaultValue={name} /></label>
          {kind === 'person' ? (
            <>
              <div className="q-field">
                who
                <Seg name="circle" initial={extra.circle ?? 'friend'} options={['friend', 'family', 'partner', 'other'].map(v => ({ value: v, label: v }))} />
              </div>
              <label className="q-field">birthday<input name="birthday" type="date" defaultValue={extra.birthday ?? ''} /></label>
            </>
          ) : (
            <label className="q-field">link<input name="url" type="url" defaultValue={extra.url ?? ''} /></label>
          )}
          <label className="q-field">
            file
            <textarea name="notes" className="q-file" defaultValue={notes ?? ''} />
          </label>
        </QForm>
      </Sheet>
    </section>
  )
}
