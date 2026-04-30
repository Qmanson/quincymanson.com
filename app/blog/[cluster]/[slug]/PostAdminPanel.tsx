'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { BlogPost, BlogCluster } from '@/lib/types'
import { updatePostField, togglePublished, deletePost } from '../../actions'
import { BLOG } from '@/lib/content'

interface Props {
  post: BlogPost
  clusterSlug: string
  allClusters: Pick<BlogCluster, 'id' | 'name' | 'slug'>[]
}

export default function PostAdminPanel({ post, clusterSlug }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState(post.body_md)
  const [title, setTitle] = useState(post.title)
  const [coverUrl, setCoverUrl] = useState(post.cover_url ?? '')
  const [tags, setTags] = useState(post.tags.join(', '))
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)

  async function saveAll() {
    setSaving(true)
    await Promise.all([
      updatePostField(post.id, 'title', title),
      updatePostField(post.id, 'body_md', body),
      updatePostField(post.id, 'cover_url', coverUrl || null),
      updatePostField(post.id, 'tags', tags.split(',').map(t => t.trim()).filter(Boolean)),
    ])
    setSaving(false)
    router.refresh()
  }

  async function handlePublishToggle() {
    await togglePublished(post.id, !post.published)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(BLOG.confirmDeletePost)) return
    await deletePost(post.id, `/blog/${clusterSlug}`)
  }

  return (
    <div style={{ marginTop: 32, paddingTop: 14, borderTop: '2px dashed var(--accent)' }}>
      <div className="window">
        <div className="window-titlebar">
          <span>{BLOG.adminPanelTitle}</span>
        </div>
        <div className="window-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => setOpen(!open)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
              {open ? BLOG.hideEditor : BLOG.showEditor}
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handlePublishToggle}
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: post.published ? undefined : '#90EE90',
                }}
              >
                {post.published ? BLOG.unpublishButton : BLOG.publishButton}
              </button>
              <button
                onClick={handleDelete}
                style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00' }}
              >
                {BLOG.deleteButton}
              </button>
            </div>
          </div>

          {open && (
            <div>
              <table style={{ width: '100%', marginBottom: 10 }}>
                <tbody>
                  <tr>
                    <td className="label" style={{ padding: '4px 8px 4px 0', width: 90, verticalAlign: 'top', paddingTop: 8 }}>{BLOG.fieldTitle}</td>
                    <td><input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} /></td>
                  </tr>
                  <tr>
                    <td className="label" style={{ padding: '4px 8px 4px 0', verticalAlign: 'top', paddingTop: 8 }}>{BLOG.fieldCover}</td>
                    <td><input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder={BLOG.coverPlaceholder} style={{ width: '100%' }} /></td>
                  </tr>
                  <tr>
                    <td className="label" style={{ padding: '4px 8px 4px 0', verticalAlign: 'top', paddingTop: 8 }}>{BLOG.fieldTags}</td>
                    <td><input value={tags} onChange={e => setTags(e.target.value)} placeholder={BLOG.tagsPlaceholder} style={{ width: '100%' }} /></td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: 4 }}>
                <button onClick={() => setTab('write')} style={{
                  fontFamily: 'Courier New, monospace', fontSize: 11,
                  fontWeight: tab === 'write' ? 'bold' : 'normal',
                  background: tab === 'write' ? '#ffff99' : undefined,
                }}>{BLOG.writeTab}</button>
                <button onClick={() => setTab('preview')} style={{
                  fontFamily: 'Courier New, monospace', fontSize: 11,
                  fontWeight: tab === 'preview' ? 'bold' : 'normal',
                  background: tab === 'preview' ? '#ffff99' : undefined,
                  marginLeft: 4,
                }}>{BLOG.previewTab}</button>
              </div>

              {tab === 'write' ? (
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={20}
                  style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.5 }}
                />
              ) : (
                <div style={{ background: '#fff', border: '2px inset #888', padding: 12, minHeight: 200 }}>
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {body || '*No content yet.*'}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <button onClick={saveAll} disabled={saving} style={{ fontWeight: 'bold' }}>
                  {saving ? BLOG.savingLabel : BLOG.saveLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
