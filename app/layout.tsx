import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SITE } from '@/lib/content'

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  icons: { icon: '/favicon.png' },
}

// Lives on the root so it's in place on whatever page the home-screen app
// first loads (often /login) — iOS won't pick it up on client navigation.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
