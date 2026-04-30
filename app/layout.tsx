import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import AdminBar from '@/components/AdminBar'
import { isAdmin, getUser } from '@/lib/auth'
import { SITE, FOOTER } from '@/lib/content'

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  icons: { icon: '/favicon.png' },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [admin, user] = await Promise.all([isAdmin(), getUser()])
  const year = new Date().getFullYear()

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
          <Nav isAdmin={admin} user={user} />
          <main>{children}</main>
          <div className="mt-16 text-center" style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#aaa' }}>
            <hr style={{ border: 'none', borderTop: '1px dashed #888', margin: '20px 0' }} />
            {FOOTER.line1 && <p>{FOOTER.line1}</p>}
            {FOOTER.line2 && <p style={{ marginTop: 4 }}>{FOOTER.line2.replace('{year}', String(year))}</p>}
          </div>
        </div>
        {admin && <AdminBar />}
      </body>
    </html>
  )
}
