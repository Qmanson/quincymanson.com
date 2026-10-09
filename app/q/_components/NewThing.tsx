'use client'

import { useState } from 'react'
import { saveOrg, savePerson } from '../plan/actions'
import QForm from './Form'
import Sheet from './Sheet'
import { Seg } from './Pickers'

/** "+ person" / "+ org" button with its sheet. */
export default function NewThing({ kind }: { kind: 'person' | 'org' }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <button type="button" className="q-pos" onClick={() => setOpen(true)}>+ {kind}</button>
      <Sheet open={open} onClose={close} title={kind === 'person' ? 'new person' : 'new organization'}>
        {kind === 'person' ? (
          <QForm action={savePerson.bind(null, null)} onDone={close}>
            <label className="q-field">name<input name="name" required /></label>
            <div className="q-field">
              who
              <Seg name="circle" initial="friend" options={['friend', 'family', 'partner', 'other'].map(v => ({ value: v, label: v }))} />
            </div>
            <label className="q-field">birthday<input name="birthday" type="date" /></label>
            <label className="q-field">file / notes<textarea name="notes" rows={4} /></label>
          </QForm>
        ) : (
          <QForm action={saveOrg.bind(null, null)} onDone={close}>
            <label className="q-field">name<input name="name" required placeholder="strong towns" /></label>
            <label className="q-field">link<input name="url" type="url" placeholder="https://" /></label>
            <label className="q-field">file / notes<textarea name="notes" rows={4} /></label>
          </QForm>
        )}
      </Sheet>
    </>
  )
}
