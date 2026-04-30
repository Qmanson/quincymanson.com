'use client'

import { useState, useRef, useEffect } from 'react'

interface EditableTextProps {
  value: string
  onSave: (value: string) => Promise<void>
  isAdmin: boolean
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  className?: string
  placeholder?: string
  multiline?: boolean
}

export default function EditableText({
  value,
  onSave,
  isAdmin,
  as: Tag = 'span',
  className = '',
  placeholder = 'Click to edit…',
  multiline = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  async function handleSave() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
    if (e.key === 'Enter' && !multiline) handleSave()
  }

  if (!isAdmin) return <Tag className={className}>{value}</Tag>

  if (editing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        rows={3}
        style={{ width: '100%' }}
      />
    ) : (
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <Tag
      className={className}
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        cursor: 'text',
        outline: '1px dotted transparent',
        outlineOffset: 2,
        transition: 'outline 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.outline = '1px dotted var(--accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.outline = '1px dotted transparent' }}
    >
      {value || <span style={{ color: '#999', fontStyle: 'italic' }}>{placeholder}</span>}
    </Tag>
  )
}
