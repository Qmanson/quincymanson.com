'use client'

import EditableText from '@/components/EditableText'
import { updateMedium } from '../actions'
import type { Medium } from '@/lib/types'

const H1_STYLE: React.CSSProperties = {
  fontFamily: 'Times New Roman, serif',
  fontSize: 26,
  color: 'var(--accent)',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  margin: 0,
  letterSpacing: 1,
}

export default function MediumHeader({
  medium,
  isAdmin,
}: {
  medium: Medium
  isAdmin: boolean
}) {
  return (
    <div style={H1_STYLE}>
      <EditableText
        value={medium.name}
        onSave={async v => { await updateMedium(medium.id, v) }}
        isAdmin={isAdmin}
        as="span"
      />
    </div>
  )
}
