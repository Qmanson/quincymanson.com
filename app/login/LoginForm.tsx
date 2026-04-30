'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LOGIN } from '@/lib/content'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <form onSubmit={handleSubmit}>
      <table style={{ width: '100%', marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px 4px 0', width: 80 }} className="label">
              {LOGIN.emailLabel}
            </td>
            <td>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px 4px 0' }} className="label">{LOGIN.passwordLabel}</td>
            <td>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
            </td>
          </tr>
        </tbody>
      </table>

      {error && (
        <p style={{
          fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00',
          background: '#ffeeee', padding: '4px 8px', border: '1px solid #a00', marginBottom: 12,
        }}>
          {LOGIN.errorPrefix} {error}
        </p>
      )}

      <div style={{ textAlign: 'center' }}>
        <button type="submit" disabled={loading} style={{ fontWeight: 'bold', minWidth: 80 }}>
          {loading ? LOGIN.submitWaiting : LOGIN.submitLabel}
        </button>
      </div>
    </form>
  )
}
