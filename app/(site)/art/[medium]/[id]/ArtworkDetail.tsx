'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Artwork, Medium, ArtworkFile } from '@/lib/types'
import { updateArtwork, addArtworkFile, removeArtworkFile, deleteArtwork, uploadArtworkFile } from '../../actions'
import { ART } from '@/lib/content'
import { compressImage } from '@/lib/imageCompress'
import LikeButton from '@/components/LikeButton'
import Link from 'next/link'

interface Props {
  artwork: Artwork
  mediumSlug: string
  allMediums: Pick<Medium, 'id' | 'name' | 'slug'>[]
  isAdmin: boolean
}

export default function ArtworkDetail({ artwork, mediumSlug, allMediums, isAdmin }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(artwork.title)
  const [year, setYear] = useState(artwork.year?.toString() ?? '')
  const [description, setDescription] = useState(artwork.description ?? '')
  const [mediumId, setMediumId] = useState(artwork.medium_id ?? '')
  const [tags, setTags] = useState(artwork.tags.join(', '))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const files = artwork.files as ArtworkFile[]
  const currentFile = files[selectedIdx]

  async function save() {
    setSaving(true)
    await updateArtwork(artwork.id, {
      title,
      year: year ? parseInt(year) : null,
      description: description || null,
      medium_id: mediumId || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Compress images client-side before upload (skips for video/audio/gif/svg)
      const optimized = await compressImage(file)
      const fd = new FormData()
      fd.append('file', optimized)
      const url = await uploadArtworkFile(fd)
      const type: ArtworkFile['type'] = optimized.type.startsWith('video') ? 'video'
        : optimized.type.startsWith('audio') ? 'audio' : 'image'
      await addArtworkFile(artwork.id, { url, type, caption: file.name })
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveFile(url: string) {
    if (!confirm(ART.confirmRemoveFile)) return
    await removeArtworkFile(artwork.id, url)
    setSelectedIdx(0)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(ART.confirmDeleteArtwork)) return
    await deleteArtwork(artwork.id, `/art/${mediumSlug}`)
  }

  return (
    <div>
      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            position: 'relative',
            aspectRatio: '16/10',
            background: '#fff',
            border: '4px ridge var(--bevel-darker)',
            padding: 4,
            overflow: 'hidden',
          }}>
            {currentFile.type === 'image' && (
              <Image src={currentFile.url} alt={artwork.title} fill style={{ objectFit: 'contain' }} />
            )}
            {currentFile.type === 'video' && (
              <video src={currentFile.url} controls style={{ width: '100%', height: '100%' }} />
            )}
            {currentFile.type === 'audio' && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <audio src={currentFile.url} controls style={{ width: '100%' }} />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => handleRemoveFile(currentFile.url)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  fontFamily: 'Courier New, monospace', fontSize: 11,
                  color: '#a00',
                }}
              >
                {ART.removeFileButton}
              </button>
            )}
          </div>

          {files.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8 }}>
              {files.map((f, i) => (
                <button
                  key={f.url}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    flexShrink: 0,
                    width: 56, height: 56,
                    padding: 0,
                    border: i === selectedIdx ? '3px ridge var(--accent)' : '3px ridge var(--bevel-darker)',
                    background: '#fff',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {f.type === 'image' ? (
                    <Image src={f.url} alt="" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'Courier New, monospace', fontSize: 10 }}>{f.type}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!editing ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: 26,
              fontWeight: 'bold',
              margin: 0,
              color: 'var(--ink)',
            }}>
              {artwork.title}
              {artwork.year && (
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: 14, color: '#666', marginLeft: 10 }}>
                  ({artwork.year})
                </span>
              )}
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <LikeButton artworkId={artwork.id} initialLikes={artwork.likes} size="md" />
              {isAdmin && (
                <>
                  <button onClick={() => setEditing(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
                    {ART.editButton}
                  </button>
                  <button onClick={handleDelete} style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00' }}>
                    {ART.deleteButton}
                  </button>
                </>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #888', margin: '12px 0' }} />

          {artwork.description && (
            <p style={{ lineHeight: 1.7, color: '#222' }}>{artwork.description}</p>
          )}

          {artwork.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
              {artwork.tags.map(t => (
                <Link
                  key={t}
                  href={`/art/${mediumSlug}?tag=${encodeURIComponent(t)}`}
                  style={{
                    display: 'inline-block',
                    background: '#e0d8c0',
                    border: '1px solid #888',
                    padding: '0 6px',
                    fontSize: 11,
                    fontFamily: 'Courier New, monospace',
                    textDecoration: 'none',
                    color: 'var(--ink)',
                  }}
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'inline-block', cursor: uploading ? 'wait' : 'pointer' }}>
                <span className="btn" style={{
                  display: 'inline-block',
                  fontFamily: 'Courier New, monospace',
                  fontSize: 12,
                  fontWeight: 'bold',
                  opacity: uploading ? 0.5 : 1,
                }}>
                  {uploading ? ART.uploadingLabel : ART.uploadButton}
                </span>
                <input type="file" accept="image/*,video/*,audio/*" onChange={handleUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div>
          <table style={{ width: '100%', marginBottom: 10 }}>
            <tbody>
              <tr>
                <td className="label" style={{ padding: '4px 8px 4px 0', width: 100 }}>{ART.fieldTitle}</td>
                <td><input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} /></td>
              </tr>
              <tr>
                <td className="label" style={{ padding: '4px 8px 4px 0' }}>{ART.fieldYear}</td>
                <td><input value={year} onChange={e => setYear(e.target.value)} type="number" placeholder="2024" style={{ width: 100 }} /></td>
              </tr>
              <tr>
                <td className="label" style={{ padding: '4px 8px 4px 0' }}>{ART.fieldMedium}</td>
                <td>
                  <select value={mediumId} onChange={e => setMediumId(e.target.value)}>
                    <option value="">{ART.noMediumOption}</option>
                    {allMediums.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
              </tr>
              <tr>
                <td className="label" style={{ padding: '4px 8px 4px 0' }}>TAGS:</td>
                <td>
                  <input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="comma, separated"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>
              <tr>
                <td className="label" style={{ padding: '4px 8px 4px 0', verticalAlign: 'top', paddingTop: 8 }}>{ART.fieldDesc}</td>
                <td>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ width: '100%', resize: 'vertical' }} />
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={save} disabled={saving} style={{ fontWeight: 'bold' }}>
              {saving ? ART.savingLabel : ART.saveButton}
            </button>
            <button onClick={() => setEditing(false)}>{ART.cancelButton}</button>
          </div>
        </div>
      )}
    </div>
  )
}
