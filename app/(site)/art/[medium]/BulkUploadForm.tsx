'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { batchCreateArtworks } from '../actions'
import { compressImage } from '@/lib/imageCompress'

interface Props {
  mediumId: string
}

/**
 * Bulk-upload UI: pick many image/video/audio files at once,
 * shows per-file progress, creates one artwork per file.
 */
export default function BulkUploadForm({ mediumId }: Props) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [savings, setSavings] = useState({ before: 0, after: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list) return
    setFiles(Array.from(list))
    setError(null)
    setDone(0)
  }

  async function submit() {
    if (!files.length) return
    setBusy(true)
    setError(null)
    setDone(0)
    try {
      // Upload one at a time so progress feels real and we don't overwhelm the action
      let totalBefore = 0
      let totalAfter = 0
      for (let i = 0; i < files.length; i++) {
        // Compress before upload — auto-skips for video/audio/gif/svg
        const optimized = await compressImage(files[i])
        totalBefore += files[i].size
        totalAfter += optimized.size
        setSavings({ before: totalBefore, after: totalAfter })
        const fd = new FormData()
        fd.append('medium_id', mediumId)
        fd.append('files', optimized)
        await batchCreateArtworks(fd)
        setDone(i + 1)
      }
      router.refresh()
      // Reset state on success
      setFiles([])
      setOpen(false)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setFiles([])
    setError(null)
    setDone(0)
    setSavings({ before: 0, after: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>
        [📦 BULK UPLOAD]
      </button>
    )
  }

  return (
    <div className="window" style={{ marginTop: 12 }}>
      <div className="window-titlebar">
        <span>bulk_upload.dlg</span>
        <button onClick={() => { reset(); setOpen(false) }} style={{ padding: '0 6px', fontSize: 11 }}>
          ✕
        </button>
      </div>
      <div className="window-body">
        <p className="label" style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
          PICK MULTIPLE FILES — ONE ARTWORK PER FILE
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={pickFiles}
          disabled={busy}
          style={{ marginBottom: 10, fontFamily: 'Courier New, monospace', fontSize: 12 }}
        />

        {files.length > 0 && (
          <div style={{
            background: '#fff',
            border: '2px inset #888',
            padding: 8,
            marginBottom: 10,
            maxHeight: 180,
            overflowY: 'auto',
            fontFamily: 'Courier New, monospace',
            fontSize: 12,
          }}>
            <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>
              {files.length} file{files.length === 1 ? '' : 's'} queued
              {busy && ` · ${done}/${files.length} uploaded`}
            </p>
            {savings.before > 0 && savings.after > 0 && savings.after < savings.before && (
              <p style={{ margin: '0 0 4px', color: '#0a0', fontSize: 11 }}>
                ↓ compressed {(savings.before / 1024).toFixed(0)} KB → {(savings.after / 1024).toFixed(0)} KB
                ({Math.round((1 - savings.after / savings.before) * 100)}% smaller)
              </p>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {files.map((f, i) => (
                <li key={i} style={{ padding: '1px 0', color: i < done ? '#0a0' : '#333' }}>
                  {i < done ? '✓' : busy && i === done ? '↻' : '·'} {f.name}
                  <span style={{ color: '#888', marginLeft: 6 }}>
                    ({(f.size / 1024).toFixed(0)} KB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p style={{
            fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00',
            background: '#ffeeee', padding: '4px 8px', border: '1px solid #a00', marginBottom: 10,
          }}>
            ! ERROR: {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={submit} disabled={busy || files.length === 0} style={{ fontWeight: 'bold' }}>
            {busy ? `UPLOADING ${done + 1}/${files.length}...` : '📤 UPLOAD ALL'}
          </button>
          <button onClick={reset} disabled={busy}>CLEAR</button>
        </div>
      </div>
    </div>
  )
}
