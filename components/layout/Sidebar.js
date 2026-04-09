'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

const NAV = [
  { href: '/dashboard',      icon: '⬡', label: 'Dashboard'        },
  { href: '/registrations',  icon: '📋', label: 'Applications',    badge: 'pending_tutors' },
  { href: '/tutors',         icon: '👤', label: 'Tutors & Lessons' },
  { href: '/reports',        icon: '⚑',  label: 'Reports',         badge: 'open_reports'   },
  { href: '/reviews',        icon: '★',  label: 'Reviews'          },
  { divider: true },
  { href: '/analytics',      icon: '📈', label: 'Analytics'        },
  { href: '/payments',       icon: '💳', label: 'Payments'         },
  { href: '/users',          icon: '👥', label: 'Users'            },
  { divider: true },
  { href: '/topic-requests', icon: '💬', label: 'Topic Requests'   },
  { href: '/announcements',  icon: '📣', label: 'Announcements'    },
  { href: '/coupons',        icon: '%',  label: 'Coupons'          },
  { divider: true },
  { href: '/logs',           icon: '📜', label: 'Audit Log'        },
]

export default function Sidebar({ badges = {} }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { darkMode, toggleDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-200"
      style={{
        width: collapsed ? 56 : 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        {!collapsed && (
          <Link href="/dashboard" className="font-serif text-base"
            style={{ color: 'var(--sidebar-text)' }}>
            RaT <span style={{ color: 'var(--accent-lit)', fontStyle: 'italic' }}>Admin</span>
          </Link>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition hover:opacity-80"
          style={{ color: 'var(--sidebar-muted)', marginLeft: collapsed ? 'auto' : 0 }}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((item, i) => {
          if (item.divider) {
            return (
              <div key={i} className="my-2 mx-2"
                style={{ borderTop: '1px solid var(--sidebar-border)' }} />
            )
          }

          const active   = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badgeVal = item.badge ? (badges[item.badge] ?? 0) : 0

          return (
            <Link key={item.href} href={item.href}
              className="relative flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
              }}
              title={collapsed ? item.label : undefined}>
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-base">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="flex-1 font-medium" style={{ fontSize: 13 }}>{item.label}</span>
              )}
              {!collapsed && badgeVal > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--accent-lit)', color: 'var(--primary)' }}>
                  {badgeVal}
                </span>
              )}
              {collapsed && badgeVal > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 flex-shrink-0 space-y-0.5"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <button onClick={toggleDark}
          className="flex items-center gap-3 px-2 py-2 rounded-lg w-full text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--sidebar-muted)' }}
          title={collapsed ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}>
          <span className="w-5 h-5 flex items-center justify-center">
            {darkMode ? '☀' : '🌙'}
          </span>
          {!collapsed && <span style={{ fontSize: 13 }}>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-2 rounded-lg w-full text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--sidebar-muted)' }}>
          <span className="w-5 h-5 flex items-center justify-center">↩</span>
          {!collapsed && <span style={{ fontSize: 13 }}>Log out</span>}
        </button>
      </div>
    </aside>
  )
}
