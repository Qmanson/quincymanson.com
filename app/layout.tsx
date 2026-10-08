import type { Metadata } from 'next'
import './globals.css'
import { SITE } from '@/lib/content'

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
