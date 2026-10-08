import { qPage } from '@/lib/q/db'
import { getBalances } from '@/lib/q/ledger'
import ShopList from './ShopList'

export default async function Shop() {
  const db = await qPage()
  const [{ data: rewards }, { balance }] = await Promise.all([
    db.from('q_rewards').select('*').neq('status', 'retired').order('cost'),
    getBalances(db),
  ])

  return (
    <main className="q-main">
      <div>
        <div className="q-tiny q-dim">spend what you earn</div>
        <h1 className="q-h1">shop</h1>
      </div>
      <ShopList rewards={rewards ?? []} balance={balance} />
    </main>
  )
}
