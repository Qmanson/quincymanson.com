import Link from 'next/link'
import { notFound } from 'next/navigation'
import { qPage } from '@/lib/q/db'
import { getBalances } from '@/lib/q/ledger'
import { signPaths } from '@/lib/q/media'
import { formatQ } from '@/lib/q/points'
import { dateOf, relativeDay } from '@/lib/q/time'
import ProductActions from './ProductActions'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await qPage()
  const [{ data: r }, { balance }, { data: purchases }] = await Promise.all([
    db.from('q_rewards').select('*').eq('id', id).maybeSingle(),
    getBalances(db),
    db.from('q_purchases').select('*').eq('reward_id', id).order('purchased_at', { ascending: false }),
  ])
  if (!r) notFound()
  const signed = await signPaths(db, [r.image_path])
  const img = (r.image_path && signed.get(r.image_path)) || r.image_url || null
  const short = r.cost - balance

  return (
    <main className="q-main" data-d={r.domain ?? undefined}>
      <Link href="/q/shop" className="q-tiny q-dim">← shop</Link>

      <div className="q-hero-img">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" />
        ) : (
          <span className="q-product-ph" style={{ fontSize: 96, fontFamily: 'var(--font-q-display)', color: 'var(--faint)' }}>
            {r.title.slice(0, 1)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="q-tiny" style={{ display: 'flex', gap: 8 }}>
          <span className="q-dim">{r.category}</span>
          {r.domain && <span className="q-tag">{r.domain}</span>}
          {r.repeatable && <span className="q-dim">repeatable{r.cooldown_days ? ` · every ${r.cooldown_days}d` : ''}</span>}
        </div>
        <h1 className="q-h1" style={{ fontSize: 34 }}>{r.title}</h1>
        <div className="q-price" style={{ fontSize: 40 }}>Q$ {formatQ(r.cost)}</div>
        {r.status === 'available' && (
          short > 0 ? (
            <>
              <div className="q-bar"><i style={{ width: `${Math.max(0, Math.min(1, balance / r.cost)) * 100}%` }} /></div>
              <div className="q-small q-dim">{formatQ(short)} Q$ to go</div>
            </>
          ) : (
            <div className="q-small q-pos">you can afford this</div>
          )
        )}
      </div>

      <ProductActions reward={r} imageSrc={img} canBuy={r.status === 'available' && balance >= 0 && short <= 0} />

      {r.notes && <p className="q-dim" style={{ whiteSpace: 'pre-wrap' }}>{r.notes}</p>}

      {purchases && purchases.length > 0 && (
        <section className="q-panel">
          <div className="q-panel-title"><span>▸ <b>bought</b></span><span>{purchases.length}×</span></div>
          {purchases.map(p => (
            <div key={p.id} className="q-row" style={{ minHeight: 40 }}>
              <span className="q-row-main">{relativeDay(dateOf(p.purchased_at))}</span>
              <span className="q-value q-neg">−{formatQ(p.cost)}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
