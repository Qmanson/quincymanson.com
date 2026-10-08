import type { Metadata, Viewport } from 'next'
import { Space_Mono, VT323 } from 'next/font/google'
import './q.css'
import { qPage } from '@/lib/q/db'
import { closeOut } from '@/lib/q/closeout'
import { getBalances } from '@/lib/q/ledger'
import { formatQ } from '@/lib/q/points'
import TabBar from './_components/TabBar'
import Toaster from './_components/Toast'

const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-q-mono' })
const display = VT323({ weight: '400', subsets: ['latin'], variable: '--font-q-display' })

export const metadata: Metadata = {
  title: 'q',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'q', statusBarStyle: 'black-translucent' },
  icons: { apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#05060f',
}

export default async function QLayout({ children }: { children: React.ReactNode }) {
  const db = await qPage()
  await closeOut(db)
  const { balance, pending } = await getBalances(db)

  return (
    <div className={`q-app ${mono.variable} ${display.variable}`}>
      <header className="q-header">
        <span className="q-logo">q<span className="q-blink">_</span></span>
        <div className="q-wallet">
          <div className="q-balance">Q$ {formatQ(balance)}</div>
          <div className="q-pending">
            pending <span className={pending < 0 ? 'q-neg' : 'q-pos'}>{pending >= 0 ? '+' : ''}{formatQ(pending)}</span>
          </div>
        </div>
      </header>
      {children}
      <TabBar />
      <Toaster />
    </div>
  )
}
