'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface EditableMarkdownProps {
  value: string
  onSave: (value: string) => Promise<void>
  isAdmin: boolean
  className?: string
}

export default function EditableMarkdown({
  value,
  onSave,
  isAdmin,
  className = '',
}: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
    setTab('write')
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setTab('write')
  }

  if (!isAdmin || !editing) {
    return (
      <div className={`relative group ${className}`}>
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {value || '*No content yet.*'}
          </ReactMarkdown>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            className="mt-3 font-mono text-xs text-stone-600 hover:text-stone-400 transition-colors"
          >
            edit
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setTab('write')}
          className={`font-mono text-xs px-3 py-1 rounded transition-colors ${
            tab === 'write'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          write
        </button>
        <button
          onClick={() => setTab('preview')}
          className={`font-mono text-xs px-3 py-1 rounded transition-colors ${
            tab === 'preview'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          preview
        </button>
      </div>

      {tab === 'write' ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={20}
          className="w-full bg-stone-900 border border-stone-700 text-stone-100 px-4 py-3 rounded font-mono text-sm focus:outline-none focus:border-stone-500 resize-y leading-relaxed"
        />
      ) : (
        <div className="bg-stone-900 border border-stone-700 rounded px-4 py-3 min-h-48">
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {draft || '*No content yet.*'}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-mono text-sm bg-stone-100 text-stone-900 px-4 py-1.5 rounded hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? 'saving…' : 'save'}
        </button>
        <button
          onClick={handleCancel}
          className="font-mono text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          cancel
        </button>
      </div>
    </div>
  )
}
