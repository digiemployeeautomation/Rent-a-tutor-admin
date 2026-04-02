'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const errorParam   = searchParams.get('error')
  const redirectTo   = searchParams.get('redirectTo') ?? '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(
    errorParam === 'not_admin' ? 'This account does not have admin access.' : ''
  )

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    // Verify admin role before proceeding
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('This account does not have admin access.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}>

      {/* Background texture */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #fac775 0%, transparent 50%), radial-gradient(circle at 75% 75%, #3b6d11 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-serif text-3xl mb-1" style={{ color: 'var(--sidebar-text)' }}>
            Rent a <span style={{ color: 'var(--accent-lit)', fontStyle: 'italic' }}>Tutor</span>
          </div>
          <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--sidebar-muted)' }}>
            Administration Console
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--sidebar-border)' }}>
          <h2 className="font-serif text-xl mb-6" style={{ color: 'var(--sidebar-text)' }}>
            Sign in to admin
          </h2>

          {error && (
            <div className="rounded-lg px-4 py-3 mb-5 text-sm"
              style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium uppercase tracking-wide"
                style={{ color: 'var(--sidebar-muted)' }}>
                Email address
              </label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@rentatutor.co.zm"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--sidebar-border)',
                  color: 'var(--sidebar-text)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-medium uppercase tracking-wide"
                style={{ color: 'var(--sidebar-muted)' }}>
                Password
              </label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--sidebar-border)',
                  color: 'var(--sidebar-text)',
                }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-lit)', color: 'var(--primary)' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: 'var(--sidebar-muted)' }}>
            Access restricted to authorised administrators only.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'var(--sidebar-bg)' }} />}>
      <LoginForm />
    </Suspense>
  )
}
