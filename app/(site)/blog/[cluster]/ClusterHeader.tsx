'use client'

import EditableText from '@/components/EditableText'
import { updateCluster } from '../actions'
import type { BlogCluster } from '@/lib/types'

const H1_STYLE: React.CSSProperties = {
  fontFamily: 'Times New Roman, serif',
  fontSize: 26,
  color: 'var(--accent)',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  margin: 0,
  letterSpacing: 1,
}
const DESC_STYLE: React.CSSProperties = {
  fontFamily: 'Times New Roman, serif',
  fontSize: 15,
  fontStyle: 'italic',
  color: '#444',
  margin: '4px 0 0 0',
}

export default function ClusterHeader({
  cluster,
  isAdmin,
}: {
  cluster: BlogCluster
  isAdmin: boolean
}) {
  return (
    <>
      <div style={H1_STYLE}>
        <EditableText
          value={cluster.name}
          onSave={async v => { await updateCluster(cluster.id, { name: v }) }}
          isAdmin={isAdmin}
          as="span"
        />
      </div>
      {(cluster.description || isAdmin) && (
        <div style={DESC_STYLE}>
          <EditableText
            value={cluster.description ?? ''}
            onSave={async v => { await updateCluster(cluster.id, { description: v }) }}
            isAdmin={isAdmin}
            as="span"
            placeholder="Add a description…"
          />
        </div>
      )}
    </>
  )
}
