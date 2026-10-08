'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Domain, QProject } from '@/lib/q/types'
import { relativeDay } from '@/lib/q/time'
import { createProject, updateProject } from '../plan/actions'
import QForm from './Form'
import Sheet from './Sheet'
import { DomainPicker, Seg } from './Pickers'

export type ProjectRow = QProject & { open: number; done: number }

const STATUS_OPTS = [
  { value: 'idea', label: 'idea' },
  { value: 'active', label: 'active' },
  { value: 'paused', label: 'paused' },
  { value: 'done', label: 'done' },
  { value: 'dropped', label: 'dropped' },
] as const

export function ProjectForm({ p, domain, onDone }: { p?: QProject; domain?: Domain; onDone: () => void }) {
  return (
    <QForm action={p ? updateProject.bind(null, p.id) : createProject} onDone={onDone}>
      <label className="q-field">
        project
        <textarea name="title" rows={2} required defaultValue={p?.title} placeholder="build record box" />
      </label>
      <DomainPicker initial={p?.domain ?? domain} />
      <div className="q-field">
        status
        <Seg name="status" initial={p?.status ?? 'active'} options={STATUS_OPTS} />
      </div>
      <label className="q-field">
        aiming to finish by
        <input name="target_date" type="date" defaultValue={p?.target_date ?? ''} />
      </label>
      <label className="q-field">
        notes / plan
        <textarea name="notes" rows={3} defaultValue={p?.notes ?? ''} />
      </label>
    </QForm>
  )
}

export default function Projects({ projects, domain, today: t }: { projects: ProjectRow[]; domain: Domain; today: string }) {
  const [adding, setAdding] = useState(false)
  const live = projects.filter(p => p.status !== 'done' && p.status !== 'dropped')
  const finished = projects.filter(p => p.status === 'done' || p.status === 'dropped')

  return (
    <section className="q-panel">
      <div className="q-panel-title">
        <span>▸ <b>projects</b></span>
        <button type="button" className="q-pos" onClick={() => setAdding(true)}>+ project</button>
      </div>
      {projects.length === 0 && <p className="q-empty">group tasks into a project</p>}
      {[...live, ...finished].map(p => {
        const total = p.open + p.done
        return (
          <Link key={p.id} href={`/q/p/${p.id}`} className={`q-row ${p.status === 'done' || p.status === 'dropped' ? 'is-done' : ''}`} data-d={p.domain}>
            <span className="q-row-main" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="q-row-title" style={{ whiteSpace: 'normal' }}>{p.title}</span>
              <span className="q-row-sub" style={{ display: 'flex', gap: 8 }}>
                <span>{p.status}</span>
                <span>{p.done}/{total} tasks</span>
                {p.target_date && <span className={p.target_date < t && p.status !== 'done' ? 'q-neg' : ''}>by {relativeDay(p.target_date, t)}</span>}
              </span>
              {total > 0 && <span className="q-bar" style={{ height: 3 }}><i style={{ width: `${(p.done / total) * 100}%` }} /></span>}
            </span>
            <span className="q-dim">›</span>
          </Link>
        )
      })}
      <Sheet open={adding} onClose={() => setAdding(false)} title="new project">
        <ProjectForm domain={domain} onDone={() => setAdding(false)} />
      </Sheet>
    </section>
  )
}
