import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { loadProjects } from '@/lib/q/loaders'
import { relativeDay, today } from '@/lib/q/time'
import TaskList from '../../_components/TaskList'
import ProjectActions from './ProjectActions'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const t = today()
  const { data: p } = await db.from('q_projects').select('*').eq('id', id).maybeSingle()
  if (!p) notFound()
  const [{ data: tasks }, siblings] = await Promise.all([
    db.from('q_tasks').select('*').eq('project_id', id),
    loadProjects(db, p.domain),
  ])
  const all = tasks ?? []
  const done = all.filter(x => x.done_at).length
  const refs = siblings.map(s => ({ id: s.id, title: s.title, domain: s.domain }))

  return (
    <main className="q-main" data-d={p.domain}>
      <div>
        <div className="q-tiny" style={{ display: 'flex', gap: 8 }}>
          <span className="q-tag">{p.domain}</span>
          <span className="q-dim">project · {p.status}</span>
          {p.target_date && <span className={p.target_date < t && p.status !== 'done' ? 'q-neg' : 'q-dim'}>by {relativeDay(p.target_date, t)}</span>}
        </div>
        <h1 className="q-h1" style={{ fontSize: 30, lineHeight: 1.05 }}>{p.title}</h1>
      </div>

      {all.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="q-bar"><i style={{ width: `${(done / all.length) * 100}%` }} /></div>
          <div className="q-small q-dim">{done} of {all.length} tasks done</div>
        </div>
      )}

      {p.notes && <p className="q-dim" style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</p>}

      <ProjectActions project={p} projects={refs} />
      <TaskList tasks={all} today={t} projects={refs} title="tasks" />
    </main>
  )
}
