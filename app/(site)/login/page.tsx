import { redirect } from 'next/navigation'
import { getUser, isAdmin } from '@/lib/auth'
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
  // q bounces non-admins here, so only send them back if they can get in
  if (user && (!dest.startsWith('/q') || (await isAdmin()))) redirect(dest)
  if (user) redirect('/')

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
