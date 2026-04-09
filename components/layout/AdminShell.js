'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/context/ThemeContext'

const PAGE_TITLES = {
  '/dashboard':      'Dashboard',
  '/registrations':  'Tutor Applications',
  '/tutors':         'Tutors & Lessons',
  '/reports':        'Reports & Complaints',
  '/reviews':        'Student Reviews',
  '/analytics':      'Analytics',
  '/payments':       'Payments & Payouts',
  '/users':          'Users',
  '/announcements':  'Announcements',
  '/coupons':        'Coupons',
  '/topic-requests': 'Topic Requests',
  '/logs':           'Audit Log',
}

export default function AdminShell({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { darkMode, toggleDark } = useTheme()
  const [admin, setAdmin]   = useState(null)
  const [badges, setBadges] = useState({})
  const [ready, setReady]   = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/login?error=not_admin')
        return
      }

      setAdmin({ ...user, full_name: profile?.full_name })

      const [{ count: pendingTutors }, { count: openReports }] = await Promise.all([
        supabase.from('tutors')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false)
          .is('rejection_reason', null),
        supabase.from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      setBadges({
        pending_tutors: pendingTutors ?? 0,
        open_reports:   openReports   ?? 0,
      })
      setReady(true)
    }
    init()
  }, [router])

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--primary-mid)', borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: 'var(--primary-mid)' }}>Loading admin console…</span>
        </div>
      </div>
    )
  }

  const title    = PAGE_TITLES[pathname] ?? 'Admin'
  const initials = admin?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Sidebar badges={badges} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 flex-shrink-0"
          style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <h1 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>{title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {new Date().toLocaleDateString('en-ZM', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button onClick={toggleDark} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14 }}>{darkMode ? '☀' : '🌙'}</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: 'var(--green-bg)', color: 'var(--primary-mid)' }}>
                {initials}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                {admin?.full_name ?? 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
