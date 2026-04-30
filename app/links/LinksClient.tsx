'use client'

import { useState } from 'react'
import type { Link } from '@/lib/types'
import { createLink, updateLink, deleteLink } from './actions'
import { LINKS } from '@/lib/content'

interface Props {
  links: Link[]
  allTags: string[]
  isAdmin: boolean
}

export default function LinksClient({ links, allTags, isAdmin }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = activeTag ? links.filter(l => l.tags.includes(activeTag)) : links

  return (
    <div>
      {allTags.length > 0 && (
        <div style={{
          background: '#fff', border: '2px inset #888', padding: '6px 8px', marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        }}>
          <span className="label" style={{ fontSize: 11, color: '#666', marginRight: 6 }}>{LINKS.filterLabel}</span>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              fontSize: 11,
              padding: '0 6px',
              fontWeight: !activeTag ? 'bold' : 'normal',
              background: !activeTag ? '#ffff99' : undefined,
            }}
          >
            {LINKS.filterAll}
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              style={{
                fontSize: 11, padding: '0 6px',
                fontWeight: activeTag === tag ? 'bold' : 'normal',
                background: activeTag === tag ? '#ffff99' : undefined,
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map(link => (
          <li key={link.id} style={{ padding: '10px 0', borderBottom: '1px dotted #aaa' }}>
            {editingId === link.id ? (
              <EditLinkForm
                link={link}
                onSave={async (updates) => { await updateLink(link.id, updates); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--accent)', marginRight: 6 }}>►</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                  </p>
                  {link.description && (
                    <p style={{ margin: '3px 0 0 18px', color: '#444', fontSize: 14, fontStyle: 'italic' }}>
                      {link.description}
                    </p>
                  )}
                  {link.tags.length > 0 && (
                    <div style={{ marginTop: 4, marginLeft: 18 }}>
                      {link.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                          style={{ fontSize: 10, padding: '0 5px', marginRight: 3 }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#666' }}>
                    {new Date(link.found_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingId(link.id)} style={{ fontSize: 11, padding: '0 6px' }}>{LINKS.editButton}</button>
                      <button
                        onClick={async () => { if (confirm(LINKS.confirmDelete)) await deleteLink(link.id) }}
                        style={{ fontSize: 11, padding: '0 6px', color: '#a00' }}
                      >
                        {LINKS.delButton}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}

        {filtered.length === 0 && (
          <li style={{ fontStyle: 'italic', color: '#777', padding: '8px 0' }}>
            {activeTag ? LINKS.emptyFiltered(activeTag) : LINKS.emptyAll}
          </li>
        )}
      </ul>

      {isAdmin && (
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px dashed #888' }}>
          {showNewForm ? (
            <form
              action={async (fd) => { await createLink(fd); setShowNewForm(false) }}
              className="window"
              style={{ maxWidth: 480 }}
            >
              <div className="window-titlebar"><span>{LINKS.newLinkDialogTitle}</span></div>
              <div className="window-body">
                <table style={{ width: '100%', marginBottom: 10 }}>
                  <tbody>
                    <tr>
                      <td className="label" style={{ padding: '4px 8px 4px 0', width: 80 }}>{LINKS.fieldUrl}</td>
                      <td><input name="url" type="url" placeholder={LINKS.urlPlaceholder} required autoFocus style={{ width: '100%' }} /></td>
                    </tr>
                    <tr>
                      <td className="label" style={{ padding: '4px 8px 4px 0' }}>{LINKS.fieldTitle}</td>
                      <td><input name="title" required style={{ width: '100%' }} /></td>
                    </tr>
                    <tr>
                      <td className="label" style={{ padding: '4px 8px 4px 0' }}>{LINKS.fieldDesc}</td>
                      <td><input name="description" placeholder={LINKS.descPlaceholder} style={{ width: '100%' }} /></td>
                    </tr>
                    <tr>
                      <td className="label" style={{ padding: '4px 8px 4px 0' }}>{LINKS.fieldTags}</td>
                      <td><input name="tags" placeholder={LINKS.tagsPlaceholder} style={{ width: '100%' }} /></td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit" style={{ fontWeight: 'bold' }}>{LINKS.saveLabel}</button>
                  <button type="button" onClick={() => setShowNewForm(false)}>{LINKS.cancelLabel}</button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}
            >
              {LINKS.newLinkButton}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EditLinkForm({
  link,
  onSave,
  onCancel,
}: {
  link: Link
  onSave: (updates: { url: string; title: string; description: string | null; tags: string[] }) => Promise<void>
  onCancel: () => void
}) {
  const [url, setUrl] = useState(link.url)
  const [title, setTitle] = useState(link.title)
  const [description, setDescription] = useState(link.description ?? '')
  const [tags, setTags] = useState(link.tags.join(', '))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      url, title,
      description: description || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
  }

  return (
    <table style={{ width: '100%' }}>
      <tbody>
        <tr><td colSpan={2}><input value={url} onChange={e => setUrl(e.target.value)} type="url" style={{ width: '100%' }} /></td></tr>
        <tr><td colSpan={2}><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ width: '100%', marginTop: 4 }} /></td></tr>
        <tr><td colSpan={2}><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" style={{ width: '100%', marginTop: 4 }} /></td></tr>
        <tr><td colSpan={2}><input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags" style={{ width: '100%', marginTop: 4 }} /></td></tr>
        <tr><td colSpan={2} style={{ paddingTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ fontWeight: 'bold' }}>
            {saving ? LINKS.savingLabel : LINKS.saveLabel}
          </button>
          <button onClick={onCancel} style={{ marginLeft: 4 }}>{LINKS.cancelLabel}</button>
        </td></tr>
      </tbody>
    </table>
  )
}
