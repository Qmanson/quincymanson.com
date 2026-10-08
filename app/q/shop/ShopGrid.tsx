'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { QReward } from '@/lib/q/types'
import { formatQ } from '@/lib/q/points'
import Sheet from '../_components/Sheet'
import RewardForm, { CATS } from './RewardForm'

export type Product = QReward & { img: string | null }

export function ProductImage({ p }: { p: Product }) {
  return (
    <div className="q-product-img">
      {p.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.img} alt="" loading="lazy" />
      ) : (
        <span className="q-product-ph">{p.title.slice(0, 1)}</span>
      )}
      {p.status === 'bought' && <span className="q-badge">owned</span>}
    </div>
  )
}

export default function ShopGrid({ products, balance }: { products: Product[]; balance: number }) {
  const [adding, setAdding] = useState(false)
  const [cat, setCat] = useState<string>('all')
  const shown = products.filter(p => p.status === 'available' && (cat === 'all' || p.category === cat))
  const owned = products.filter(p => p.status === 'bought')

  return (
    <>
      <div className="q-seg" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {[{ value: 'all', label: 'all' }, ...CATS].map(c => (
          <button key={c.value} type="button" className={cat === c.value ? 'is-on' : ''} onClick={() => setCat(c.value)}>
            {c.label}
          </button>
        ))}
        <button type="button" onClick={() => setAdding(true)}>+ add</button>
      </div>

      {balance < 0 && <p className="q-neg q-small" style={{ textAlign: 'center' }}>shop locked — balance is negative</p>}

      {shown.length === 0 ? (
        <p className="q-empty q-panel">nothing here yet</p>
      ) : (
        <div className="q-shop-grid">
          {shown.map(p => {
            const pct = Math.max(0, Math.min(1, balance / p.cost))
            return (
              <Link key={p.id} href={`/q/shop/${p.id}`} className="q-product" data-d={p.domain ?? undefined}>
                <ProductImage p={p} />
                <div className="q-product-body">
                  <div className="q-product-title">{p.title}</div>
                  <div className="q-price">Q$ {formatQ(p.cost)}</div>
                  {pct < 1 ? (
                    <div className="q-bar" style={{ height: 3, marginTop: 'auto' }}><i style={{ width: `${pct * 100}%` }} /></div>
                  ) : (
                    <div className="q-tiny q-pos" style={{ marginTop: 'auto' }}>can afford</div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {owned.length > 0 && cat === 'all' && (
        <>
          <div className="q-tiny q-dim">▸ owned</div>
          <div className="q-shop-grid" style={{ opacity: 0.55 }}>
            {owned.map(p => (
              <Link key={p.id} href={`/q/shop/${p.id}`} className="q-product">
                <ProductImage p={p} />
                <div className="q-product-body"><div className="q-product-title">{p.title}</div></div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="add to shop">
        <RewardForm onDone={() => setAdding(false)} />
      </Sheet>
    </>
  )
}
