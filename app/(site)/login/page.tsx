import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import LoginForm from './LoginForm'
import { LOGIN } from '@/lib/content'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  // only allow internal paths
  const dest = next && /^\/(?![/\\])/.test(next) ? next : '/'
  const user = await getUser()
  if (user) redirect(dest)

  return (
    <div className="window max-w-sm mx-auto mt-12">
      <div className="window-titlebar">
        <span>{LOGIN.windowTitle}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <p className="label" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 12 }}>
          {LOGIN.ribbon}
        </p>
        <LoginForm next={dest} />
      </div>
    </div>
  )
}
