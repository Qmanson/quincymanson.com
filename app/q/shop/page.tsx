import { qPage } from '@/lib/q/db'
import { getBalances } from '@/lib/q/ledger'
import { signPaths } from '@/lib/q/media'
import { getRate } from '@/lib/q/rate'
import ShopGrid from './ShopGrid'

export default async function Shop() {
  const db = await qPage()
  const [{ data: rewards }, { balance }, rate] = await Promise.all([
    db.from('q_rewards').select('*').neq('status', 'retired').order('cost'),
    getBalances(db),
    getRate(db),
  ])
  const signed = await signPaths(db, (rewards ?? []).map(r => r.image_path))
  const products = (rewards ?? []).map(r => ({
    ...r,
    img: (r.image_path && signed.get(r.image_path)) || r.image_url || null,
  }))

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">spend what you earn · {rate} Q$ per $1</div>
        <h1 className="q-h1">shop</h1>
      </div>
      <ShopGrid products={products} balance={balance} rate={rate} />
    </main>
  )
}
