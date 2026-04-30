import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import TrackerHeatmap from '@/components/TrackerHeatmap'
import NewTrackerForm from './NewTrackerForm'
import LogEntryForm from './LogEntryForm'
import type { TrackerEntry } from '@/lib/types'
import { TRACKERS } from '@/lib/content'

export default async function TrackersPage() {
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: trackers } = await supabase.from('trackers').select('*').order('sort_order')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 364)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('tracker_entries').select('*').gte('date', cutoffStr).order('date')

  const entriesByTracker = new Map<string, TrackerEntry[]>()
  for (const e of (entries ?? [])) {
    const list = entriesByTracker.get(e.tracker_id) ?? []
    list.push(e as TrackerEntry)
    entriesByTracker.set(e.tracker_id, list)
  }

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>{TRACKERS.windowTitle}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{
            fontFamily: 'Times New Roman, serif',
            fontSize: 30,
            fontWeight: 'bold',
            color: 'var(--accent)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            {TRACKERS.pageHeading}
          </h1>
          {admin && <LogEntryForm trackers={trackers ?? []} />}
        </div>

        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '10px 0 20px' }} />

        {admin && (
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#555', marginBottom: 16, fontStyle: 'italic' }}>
            {TRACKERS.hint}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {(trackers ?? []).map(tracker => (
            <section key={tracker.id} style={{
              background: '#fff',
              border: '2px inset #888',
              padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {tracker.icon && <span style={{ fontSize: 18 }}>{tracker.icon}</span>}
                <span
                  style={{ width: 12, height: 12, borderRadius: '50%', background: tracker.color, border: '1px solid #000', display: 'inline-block' }}
                />
                <span className="label" style={{ fontWeight: 'bold', fontSize: 14 }}>
                  {tracker.name.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#666' }}>
                  ░ {entriesByTracker.get(tracker.id)?.length ?? 0} {TRACKERS.daysLoggedSuffix} ░
                </span>
              </div>
              <TrackerHeatmap
                tracker={tracker}
                entries={entriesByTracker.get(tracker.id) ?? []}
                isAdmin={admin}
              />
            </section>
          ))}

          {(trackers ?? []).length === 0 && (
            <p style={{ fontStyle: 'italic', color: '#777' }}>{TRACKERS.empty}</p>
          )}
        </div>

        {admin && (
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px dashed #888' }}>
            <NewTrackerForm />
          </div>
        )}
      </div>
    </div>
  )
}
