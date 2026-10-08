'use client'

import { useState } from 'react'
import { DOMAINS, type Domain } from '@/lib/q/types'

/** Segmented chip picker that submits as a hidden form field. */
export function Seg<T extends string>({
  name,
  options,
  initial,
  colored,
  onChange,
}: {
  name: string
  options: readonly { value: T; label: string }[]
  initial?: T
  colored?: boolean
  onChange?: (v: T) => void
}) {
  const [value, setValue] = useState<T | undefined>(initial)
  return (
    <div className="q-seg">
      <input type="hidden" name={name} value={value ?? ''} />
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          data-d={colored ? o.value : undefined}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => { setValue(o.value); onChange?.(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function DomainPicker({ initial }: { initial?: Domain }) {
  return (
    <label className="q-field">
      domain
      <Seg name="domain" colored initial={initial} options={DOMAINS.map(d => ({ value: d, label: d }))} />
    </label>
  )
}
