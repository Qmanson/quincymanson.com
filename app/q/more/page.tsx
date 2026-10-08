import Link from 'next/link'
import { qPage } from '@/lib/q/db'
import { reviewPeriod, type ReviewCadence } from '@/lib/q/payday'
import { formatShort, quarterStart, today, yearStart } from '@/lib/q/time'
import { signOut } from '@/app/(site)/login/actions'

const REVIEWS: { c: ReviewCadence; blurb: string }[] = [
  { c: 'weekly', blurb: 'check the week · claim payday' },
  { c: 'monthly', blurb: 'budget grade · plan missions' },
  { c: 'quarterly', blurb: 'sub-theme · missions' },
  { c: 'yearly', blurb: 'theme · clothes audit' },
]

export default async function More() {
  const db = await qPage()
  const t = today()
  const [{ data: reviews }, { data: themes }] = await Promise.all([
    db.from('q_reviews').select('cadence, period_start').not('completed_at', 'is', null).order('period_start', { ascending: false }).limit(60),
    db.from('q_themes').select('*').in('period_start', [yearStart(t), quarterStart(t)]),
  ])
  const done = (c: ReviewCadence) => new Set((reviews ?? []).filter(r => r.cadence === c).map(r => r.period_start))
  const year = themes?.find(x => x.scope === 'year')
  const quarter = themes?.find(x => x.scope === 'quarter')

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">system</div>
        <h1 className="q-h1">more</h1>
      </div>

      {(year || quarter) && (
        <section className="q-panel">
          <div className="q-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {year && <div><span className="q-tiny q-faint">year · </span><span className="q-pos">✦ {year.title}</span></div>}
            {quarter && <div><span className="q-tiny q-faint">quarter · </span><span className="q-pos">✦ {quarter.title}</span></div>}
          </div>
        </section>
      )}

      <section className="q-panel">
        <div className="q-panel-title"><span>▸ <b>reviews</b></span></div>
        {REVIEWS.map(({ c, blurb }) => {
          const d = done(c)
          const p = reviewPeriod(c, d, t)
          const isDone = d.has(p)
          return (
            <Link key={c} href={`/q/review/${c}`} className={`q-row ${isDone ? 'is-done' : ''}`}>
              <span className={`q-box ${isDone ? 'is-on' : ''}`}>{isDone ? '✓' : ''}</span>
              <span className="q-row-main">
                <span className="q-row-title" style={{ display: 'block' }}>{c}</span>
                <span className="q-row-sub">{blurb} · {formatShort(p)}</span>
              </span>
              <span className="q-dim">→</span>
            </Link>
          )
        })}
      </section>

      <section className="q-panel">
        <Link href="/q/ledger" className="q-row"><span className="q-row-main">ledger</span><span className="q-dim">→</span></Link>
        <Link href="/" className="q-row"><span className="q-row-main">public site</span><span className="q-dim">↗</span></Link>
        <form action={signOut}>
          <button type="submit" className="q-row q-neg">sign out</button>
        </form>
      </section>

      <p className="q-small q-faint" style={{ textAlign: 'center' }}>
        install: share → add to home screen
      </p>
    </main>
  )
}
