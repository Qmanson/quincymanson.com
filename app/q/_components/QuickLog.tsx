'use client'

import { useState } from 'react'
import type { QLogType } from '@/lib/q/types'
import Sheet from './Sheet'
import { LogForm } from './forms'

export default function QuickLog({ logTypes }: { logTypes: QLogType[] }) {
  const [open, setOpen] = useState<QLogType | null>(null)
  return (
    <section className="q-panel">
      <div className="q-panel-title"><span>▸ <b>quick log</b></span></div>
      <div className="q-chips">
        {logTypes.map(lt => (
          <button key={lt.id} type="button" className="q-chip" data-d={lt.domain} onClick={() => setOpen(lt)}>
            <span className="q-dot" />
            {lt.name}
          </button>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `log ${open.name}` : ''}>
        {open && <LogForm logType={open} onDone={() => setOpen(null)} />}
      </Sheet>
    </section>
  )
}
