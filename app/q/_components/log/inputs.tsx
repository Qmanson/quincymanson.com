'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/imageCompress'
import type { Crop, LiftSet, MediaKind } from '@/lib/q/types'
import { cropStyle, NO_CROP } from '@/lib/q/crop'
import type { MediaHit } from '@/lib/q/media'

// ── rating: 5 stars, half steps ─────────────────────────────

export function Stars({ name, initial = null }: { name: string; initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <div className="q-stars">
      <input type="hidden" name={name} value={value ?? ''} />
      {[1, 2, 3, 4, 5].map(n => {
        const fill = value === null ? 0 : value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0
        return (
          <span key={n} className="q-star" data-fill={fill}>
            ★
            <button type="button" aria-label={`${n - 0.5} stars`} onClick={() => setValue(value === n - 0.5 ? null : n - 0.5)} />
            <button type="button" aria-label={`${n} stars`} onClick={() => setValue(value === n ? null : n)} />
          </span>
        )
      })}
      <span className="q-small q-dim" style={{ marginLeft: 8 }}>{value ?? '—'}</span>
    </div>
  )
}

// ── tags ────────────────────────────────────────────────────

export function TagInput({ name, suggestions = [], initial = [] }: { name: string; suggestions?: string[]; initial?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')

  function add(t: string) {
    const v = t.trim().toLowerCase().replace(/,/g, '')
    if (v && !tags.includes(v)) setTags([...tags, v])
    setDraft('')
  }

  const unused = suggestions.filter(s => !tags.includes(s)).slice(0, 10)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name={name} value={tags.join(',')} />
      {tags.length > 0 && (
        <div className="q-seg">
          {tags.map(t => (
            <button key={t} type="button" className="is-on" onClick={() => setTags(tags.filter(x => x !== t))}>
              #{t} ×
            </button>
          ))}
        </div>
      )}
      <input
        value={draft}
        placeholder="add a tag, press enter"
        enterKeyHint="done"
        onChange={e => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft) }
        }}
        onBlur={() => draft && add(draft)}
      />
      {unused.length > 0 && (
        <div className="q-seg">
          {unused.map(t => <button key={t} type="button" onClick={() => add(t)}>#{t}</button>)}
        </div>
      )}
    </div>
  )
}

// ── film / book / album search ──────────────────────────────

export function MediaPicker({ kind, name }: { kind: MediaKind; name: string }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MediaHit[]>([])
  const [picked, setPicked] = useState<MediaHit | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | string>('idle')

  useEffect(() => {
    if (picked || q.trim().length < 2) return
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setState('loading')
      try {
        const res = await fetch(`/q/api/media?kind=${kind}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'search failed')
        setResults(body.results)
        setState('idle')
      } catch (e) {
        if (!ctrl.signal.aborted) setState(e instanceof Error ? e.message : 'search failed')
      }
    }, 350)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [q, kind, picked])

  if (picked) {
    return (
      <div className="q-media-pick is-picked">
        <input type="hidden" name={name} value={JSON.stringify(picked)} />
        <Cover url={picked.cover_url} kind={kind} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{picked.title}</div>
          <div className="q-small q-dim">{[picked.creator, picked.year].filter(Boolean).join(' · ')}</div>
        </div>
        <button type="button" className="q-btn is-small" onClick={() => { setPicked(null); setQ('') }}>change</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={`search ${kind === 'movie' ? 'films' : kind + 's'}…`} autoFocus />
      {state === 'loading' && <p className="q-small q-dim">searching…</p>}
      {state !== 'idle' && state !== 'loading' && <p className="q-small q-neg">✕ {state}</p>}
      {q.trim().length >= 2 && results.map(r => (
        <button key={r.source_id} type="button" className="q-media-pick" onClick={() => setPicked(r)}>
          <Cover url={r.cover_url} kind={kind} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="q-row-title">{r.title}</div>
            <div className="q-small q-dim">{[r.creator, r.year].filter(Boolean).join(' · ')}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function Cover({ url, kind, size = 48 }: { url: string | null; kind: MediaKind | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const h = kind === 'album' ? size : Math.round(size * 1.5)
  if (!url || broken) return <span className="q-cover" style={{ width: size, height: h }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="q-cover" src={url} alt="" width={size} height={h} onError={() => setBroken(true)} />
}

// ── people at an event ──────────────────────────────────────

export function PeoplePicker({ people, initial = [] }: { people: { id: string; name: string }[]; initial?: string[] }) {
  const [ids, setIds] = useState<string[]>(initial)
  const [fresh, setFresh] = useState<string[]>([])
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const matches = query ? people.filter(p => p.name.toLowerCase().includes(query) && !ids.includes(p.id)).slice(0, 6) : []
  const exact = people.some(p => p.name.toLowerCase() === query) || fresh.some(n => n.toLowerCase() === query)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="people_ids" value={JSON.stringify(ids)} />
      <input type="hidden" name="new_people" value={JSON.stringify(fresh)} />
      {(ids.length > 0 || fresh.length > 0) && (
        <div className="q-seg">
          {ids.map(id => (
            <button key={id} type="button" className="is-on" onClick={() => setIds(ids.filter(x => x !== id))}>
              {people.find(p => p.id === id)?.name} ×
            </button>
          ))}
          {fresh.map(n => (
            <button key={n} type="button" className="is-on" onClick={() => setFresh(fresh.filter(x => x !== n))}>
              {n} (new) ×
            </button>
          ))}
        </div>
      )}
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="who was there"
        enterKeyHint="done"
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (matches[0]) { setIds([...ids, matches[0].id]); setQ('') }
          else if (query && !exact) { setFresh([...fresh, q.trim()]); setQ('') }
        }}
      />
      {(matches.length > 0 || (query && !exact)) && (
        <div className="q-seg">
          {matches.map(p => (
            <button key={p.id} type="button" onClick={() => { setIds([...ids, p.id]); setQ('') }}>{p.name}</button>
          ))}
          {query && !exact && (
            <button type="button" onClick={() => { setFresh([...fresh, q.trim()]); setQ('') }}>+ add “{q.trim()}”</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── photo upload (straight to private storage) + framing ────

export function PhotoInput({
  name,
  cropName,
  folder,
  initialUrl,
  initialCrop,
  fallbackUrl,
  aspect = '4 / 5',
}: {
  name: string
  cropName: string
  folder: string
  initialUrl?: string | null
  initialCrop?: Crop | null
  /** e.g. a pasted image link, shown when nothing's uploaded */
  fallbackUrl?: string | null
  aspect?: string
}) {
  const [path, setPath] = useState<string>('')
  const [picked, setPicked] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>(initialCrop ?? NO_CROP)
  const [state, setState] = useState<'idle' | 'uploading' | string>('idle')
  const ref = useRef<HTMLInputElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; c: Crop } | null>(null)
  const src = picked ?? initialUrl ?? fallbackUrl ?? null

  async function pick(file: File) {
    setPicked(URL.createObjectURL(file))
    setCrop(NO_CROP)
    setState('uploading')
    try {
      const small = await compressImage(file, { targetBytes: 900 * 1024, maxDimension: 2000 })
      const ext = small.type === 'image/png' ? 'png' : small.type === 'image/webp' ? 'webp' : 'jpg'
      const p = `${folder}/${crypto.randomUUID()}.${ext}`
      const { error } = await createClient().storage.from('q-media').upload(p, small, { contentType: small.type })
      if (error) throw error
      setPath(p)
      setState('idle')
    } catch (e) {
      setState(e instanceof Error ? e.message : 'upload failed')
    }
  }

  const clamp = (v: number) => Math.max(0, Math.min(100, v))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name={name} value={path} />
      <input type="hidden" name={cropName} value={src ? JSON.stringify(crop) : ''} />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && pick(e.target.files[0])}
      />
      {src ? (
        <>
          <div
            ref={frame}
            className="q-photo-frame"
            style={{ aspectRatio: aspect }}
            onPointerDown={e => {
              drag.current = { x: e.clientX, y: e.clientY, c: crop }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={e => {
              const d = drag.current
              const box = frame.current?.getBoundingClientRect()
              if (!d || !box) return
              // drag the picture: moving right shows more of the left side
              setCrop({
                ...d.c,
                x: clamp(d.c.x - ((e.clientX - d.x) / box.width) * 100 / d.c.z),
                y: clamp(d.c.y - ((e.clientY - d.y) / box.height) * 100 / d.c.z),
              })
            }}
            onPointerUp={() => { drag.current = null }}
            onPointerCancel={() => { drag.current = null }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} style={cropStyle(crop)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="q-tiny q-dim">zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={crop.z}
              onChange={e => setCrop({ ...crop, z: Number(e.target.value) })}
              style={{ flex: 1, padding: 0, border: 'none', background: 'none', boxShadow: 'none' }}
            />
            <button type="button" className="q-btn is-small" onClick={() => setCrop(NO_CROP)}>reset</button>
            <button type="button" className="q-btn is-small" onClick={() => ref.current?.click()}>new</button>
          </div>
          <p className="q-tiny q-faint">drag the picture to move it</p>
        </>
      ) : (
        <button type="button" className="q-photo-drop" style={{ aspectRatio: aspect }} onClick={() => ref.current?.click()}>
          <span className="q-dim">tap to add a photo</span>
        </button>
      )}
      {state === 'uploading' && <p className="q-small q-dim">uploading…</p>}
      {state !== 'idle' && state !== 'uploading' && <p className="q-small q-neg">✕ {state}</p>}
    </div>
  )
}

// ── lift: one row per workout ───────────────────────────────

const blank = (): LiftSet => ({ workout: '', sets: null, reps: null, weight: null })

export function LiftRows({ workouts }: { workouts: string[] }) {
  const [rows, setRows] = useState<LiftSet[]>([blank()])
  const set = (i: number, patch: Partial<LiftSet>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const n = (v: string) => (v === '' ? null : Number(v))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="sets" value={JSON.stringify(rows)} />
      <datalist id="q-workouts">{workouts.map(w => <option key={w} value={w} />)}</datalist>
      {rows.map((r, i) => (
        <div key={i} className="q-lift-row">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              list="q-workouts"
              value={r.workout}
              onChange={e => set(i, { workout: e.target.value })}
              placeholder="workout — pick or type new"
              autoFocus={i === rows.length - 1}
            />
            {rows.length > 1 && (
              <button type="button" className="q-faint" style={{ padding: '0 6px' }} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
            )}
          </div>
          <div className="q-form-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <label className="q-field">sets<input type="number" inputMode="numeric" value={r.sets ?? ''} onChange={e => set(i, { sets: n(e.target.value) })} /></label>
            <label className="q-field">reps<input type="number" inputMode="numeric" value={r.reps ?? ''} onChange={e => set(i, { reps: n(e.target.value) })} /></label>
            <label className="q-field">weight<input type="number" inputMode="decimal" step="any" value={r.weight ?? ''} onChange={e => set(i, { weight: n(e.target.value) })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="q-btn is-small" onClick={() => setRows([...rows, blank()])}>+ another workout</button>
    </div>
  )
}
