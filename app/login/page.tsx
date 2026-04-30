import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import LoginForm from './LoginForm'
import { LOGIN } from '@/lib/content'

export default async function LoginPage() {
  const user = await getUser()
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
        <LoginForm />
      </div>
    </div>
  )
}
