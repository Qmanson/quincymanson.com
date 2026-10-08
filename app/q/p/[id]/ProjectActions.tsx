'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Domain, QProject } from '@/lib/q/types'
import { unwrap } from '@/lib/q/act'
import Sheet from '../../_components/Sheet'
import { TaskForm } from '../../_components/forms'
import { ProjectForm } from '../../_components/Projects'
import { toast } from '../../_components/Toast'
import { deleteProject } from '../../plan/actions'

export default function ProjectActions({
  project: p,
  projects,
}: {
  project: QProject
  projects: { id: string; title: string; domain: Domain }[]
}) {
  const [sheet, setSheet] = useState<null | 'task' | 'edit'>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const close = () => setSheet(null)

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="q-btn is-primary" style={{ flex: 2 }} onClick={() => setSheet('task')}>+ task</button>
      <button className="q-btn" style={{ flex: 1 }} onClick={() => setSheet('edit')}>edit</button>

      <Sheet open={sheet === 'task'} onClose={close} title="new task">
        <TaskForm domain={p.domain} projectId={p.id} projects={projects} onDone={close} />
      </Sheet>
      <Sheet open={sheet === 'edit'} onClose={close} title="edit project">
        <ProjectForm p={p} onDone={close} />
        <button
          className="q-btn is-danger is-block"
          style={{ marginTop: 10 }}
          disabled={pending}
          onClick={() =>
            confirm('delete project? its tasks stay.') &&
            start(async () => {
              try {
                unwrap(await deleteProject(p.id))
                router.push(`/q/d/${p.domain}`)
              } catch (e) {
                toast(`✕ ${e instanceof Error ? e.message : 'failed'}`)
              }
            })
          }
        >
          delete project
        </button>
      </Sheet>
    </div>
  )
}
