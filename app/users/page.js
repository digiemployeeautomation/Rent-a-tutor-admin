'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function UserDetailModal({ user: u, onClose }) {
  const [activity, setActivity] = useState(null)

  useEffect(() => {
    if (!u) return
    if (u.role === 'student') {
      Promise.all([
        supabase.from('lesson_purchases').select('id, amount_paid, purchased_at, lessons(title, subject)').eq('student_id', u.id).order('purchased_at', { ascending: false }).limit(10),
        supabase.from('bookings').select('id, subject, scheduled_at, status, amount').eq('student_id', u.id).order('scheduled_at', { ascending: false }).limit(5),
      ]).then(([{ data: p }, { data: b }]) => setActivity({ purchases: p ?? [], bookings: b ?? [] }))
    } else if (u.role === 'tutor') {
      Promise.all([
        supabase.from('lessons').select('id, title, subject, status, purchase_count, price').eq('tutor_id', u.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('bookings').select('id, subject, scheduled_at, status, amount').eq('tutor_id', u.id).order('scheduled_at', { ascending: false }).limit(5),
      ]).then(([{ data: l }, { data: b }]) => setActivity({ lessons: l ?? [], bookings: b ?? [] }))
    }
  }, [u])

  if (!u) return null
  const initials = (u.full_name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '88vh' }}>
        <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: u.role === 'tutor' ? 'var(--blue-bg, #eff6ff)' : 'var(--green-bg)', color: u.role === 'tutor' ? 'var(--blue-text, #1d4ed8)' : 'var(--green-text)' }}>
                {initials}
              </div>
              <div>
                <p className="font-serif text-lg" style={{ color: 'var(--primary)' }}>{u.full_name ?? '—'}</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>{u.email} · Joined {fmt(u.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-xl" style={{ color: '#9ca3af' }}>✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {u.role === 'student' ? [
              { label: 'Purchases',   value: activity?.purchases?.length ?? '—' },
              { label: 'Sessions',    value: activity?.bookings?.length ?? '—' },
              { label: 'Spent',       value: activity?.purchases ? `K${activity.purchases.reduce((s, p) => s + (p.amount_paid ?? 0), 0)}` : '—' },
            ] : [
              { label: 'Lessons',     value: activity?.lessons?.length ?? '—' },
              { label: 'Total sales', value: activity?.lessons ? activity.lessons.reduce((s, l) => s + (l.purchase_count ?? 0), 0) : '—' },
              { label: 'Sessions',    value: activity?.bookings?.length ?? '—' },
            ]).map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg)' }}>
                <p className="text-xs mb-0.5" style={{ color: '#9ca3af' }}>{s.label}</p>
                <p className="font-serif text-xl font-bold" style={{ color: 'var(--primary)' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Activity list */}
          {u.role === 'student' && activity?.purchases?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Recent purchases</p>
              <div className="space-y-1">
                {activity.purchases.slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#111827' }}>{p.lessons?.title ?? '—'}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{p.lessons?.subject} · {fmt(p.purchased_at)}</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--primary-lit)' }}>K{p.amount_paid}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {u.role === 'tutor' && activity?.lessons?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Lessons</p>
              <div className="space-y-1">
                {activity.lessons.slice(0, 5).map(l => (
                  <div key={l.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#111827' }}>{l.title}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{l.subject} · {l.purchase_count ?? 0} purchases</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: l.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)', color: l.status === 'active' ? 'var(--green-text)' : 'var(--amber-text)' }}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('students')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [counts, setCounts]     = useState({})
  const [page, setPage]         = useState(0)
  const PAGE = 50

  const load = useCallback(async () => {
    setLoading(true)

    const [{ count: sc }, { count: tc }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tutor'),
    ])
    setCounts({ students: sc ?? 0, tutors: tc ?? 0 })

    let q = supabase
      .from('profiles')
      .select('id, full_name, role, created_at, referral_credit')
      .eq('role', tab === 'tutors' ? 'tutor' : 'student')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)

    if (search.trim()) q = q.ilike('full_name', `%${search.trim()}%`)

    const { data } = await q

    // Fetch emails from auth (admin only) — use service role in production
    // For now we show what's available from profiles
    setUsers(data ?? [])
    setLoading(false)
  }, [tab, search, page])

  useEffect(() => { setPage(0) }, [tab, search])
  useEffect(() => { load() }, [load])

  return (
    <AdminShell>
      <div className="p-6 space-y-5">

        {/* Tabs + counts */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[
              { key: 'students', label: `Students (${counts.students ?? 0})` },
              { key: 'tutors',   label: `Tutors (${counts.tutors ?? 0})`     },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="text-xs px-5 py-1.5 rounded-lg transition font-medium"
                style={tab === t.key ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' } : { color: '#6b7280' }}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', width: 220 }} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No {tab} found.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Role', 'Joined', 'Referral credit', ''].map(h =>
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const initials = (u.full_name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border-light)' }}
                        onClick={() => setSelected(u)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: tab === 'tutors' ? '#eff6ff' : 'var(--green-bg)', color: tab === 'tutors' ? '#1d4ed8' : 'var(--green-text)' }}>
                              {initials}
                            </div>
                            <span className="font-medium" style={{ color: '#111827' }}>{u.full_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize" style={{ color: '#6b7280' }}>{u.role}</td>
                        <td className="px-4 py-3" style={{ color: '#9ca3af' }}>{fmt(u.created_at)}</td>
                        <td className="px-4 py-3" style={{ color: (u.referral_credit ?? 0) > 0 ? 'var(--green-text)' : '#9ca3af' }}>
                          {(u.referral_credit ?? 0) > 0 ? `K${u.referral_credit}` : '—'}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#9ca3af' }}>View →</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-xs px-4 py-2 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>← Prev</button>
              <span className="text-xs" style={{ color: '#9ca3af' }}>Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < PAGE}
                className="text-xs px-4 py-2 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>Next →</button>
            </div>
          </>
        )}
      </div>

      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} />}
    </AdminShell>
  )
}
