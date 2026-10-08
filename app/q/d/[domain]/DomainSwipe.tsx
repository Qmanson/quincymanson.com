'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { DOMAINS, type Domain } from '@/lib/q/types'

const SWIPE_PX = 70

/** Domain strip + swipe left/right to move between domains. */
export default function DomainSwipe({ current }: { current: Domain }) {
  const router = useRouter()
  const i = DOMAINS.indexOf(current)
  const prev = DOMAINS[(i + DOMAINS.length - 1) % DOMAINS.length]
  const next = DOMAINS[(i + 1) % DOMAINS.length]
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    router.prefetch(`/q/d/${prev}`)
    router.prefetch(`/q/d/${next}`)
    strip.current?.querySelector('.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [router, prev, next])

  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let skip = false
    function down(e: TouchEvent) {
      const t = e.touches[0]
      x0 = t.clientX
      y0 = t.clientY
      // don't hijack sideways-scrolling rows or open sheets
      skip =
        document.documentElement.dataset.qSheet !== undefined ||
        !!(e.target as HTMLElement).closest('.q-chips, .q-domain-strip, input, textarea, select')
    }
    function up(e: TouchEvent) {
      if (skip) return
      const t = e.changedTouches[0]
      const dx = t.clientX - x0
      const dy = t.clientY - y0
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) > Math.abs(dx) * 0.6) return
      router.replace(`/q/d/${dx < 0 ? next : prev}`)
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
    }
  }, [router, prev, next])

  return (
    <div className="q-domain-strip" ref={strip}>
      {DOMAINS.map(d => (
        <Link key={d} href={`/q/d/${d}`} data-d={d} className={d === current ? 'is-on' : ''} replace>
          {d}
        </Link>
      ))}
    </div>
  )
}
