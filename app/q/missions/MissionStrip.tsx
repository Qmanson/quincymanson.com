import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadMissionViews } from '@/lib/q/missions'
import type { QMission } from '@/lib/q/types'
import MissionCard from './MissionCard'

/** Active missions, compact, for the top of Today. */
export default async function MissionStrip({ missions }: { missions: QMission[] }) {
  if (!missions.length) return null
  const views = await loadMissionViews(await createClient(), missions)
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="q-tiny q-dim" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>★ active missions</span>
        <Link href="/q/missions">all →</Link>
      </div>
      {missions.map(m => <MissionCard key={m.id} m={m} v={views.get(m.id)} compact />)}
    </section>
  )
}
