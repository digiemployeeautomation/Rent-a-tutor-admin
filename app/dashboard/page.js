'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

function Stat({ label, value, sub, href, alert = false }) {
  const inner = (
    <div className="rounded-xl p-4 transition hover:opacity-90"
      style={{
        backgroundColor: alert ? 'var(--amber-bg)' : 'var(--green-bg)',
        border: alert ? '1px solid #f59e0b33' : '1px solid transparent',
      }}>
      <div className="text-xs font-medium mb-1"
        style={{ color: alert ? 'var(--amber-text)' : 'var(--green-text)', opacity: 0.8 }}>
        {label}
      </div>
      <div className="font-serif text-3xl font-bold"
        style={{ color: alert ? 'var(--amber-text)' : 'var(--primary)' }}>
        {value ?? <span className="inline-block w-12 h-7 bg-black/5 rounded animate-pulse" />}
      </div>
      {sub && (
        <div className="text-xs mt-0.5"
          style={{ color: alert ? 'var(--amber-text)' : 'var(--green-text)', opacity: 0.6 }}>
          {sub}
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function DashboardPage() {
  const [stats, setStats]           = useState({})
  const [pendingTutors, setPending] = useState([])
  const [openReports, setReports]   = useState([])
  const [recentLessons, setLessons] = useState([])
  const [recentReviews, setReviews] = useState([])

  useEffect(() => {
    async function load() {
      const [
        { count: approvedTutors },
        // Only count genuinely pending tutors (rejection_reason IS NULL).
        { count: pendingCount },
        { count: students },
        { count: lessons },
        { count: openRep },
        { count: totalRev },
        { data: purch },
        { data: pending },
        { data: reports },
        { data: lessonRows },
        { data: reviewRows },
      ] = await Promise.all([
        supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('tutors').select('*', { count: 'exact', head: true })
          .eq('is_approved', false)
          .is('rejection_reason', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('lesson_purchases')
          .select('amount_paid')
          .gte('purchased_at', new Date(Date.now() - 30 * 86400000).toISOString()),

        // FIX 1: explicit FK hint — tutors.user_id references profiles.id
        supabase.from('tutors')
          .select('id, user_id, created_at, subjects, profiles!user_id(full_name)')
          .eq('is_approved', false)
          .is('rejection_reason', null)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase.from('reports')
          .select('id, reason, reported_type, created_at, profiles!reporter_id(full_name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase.from('lessons')
          .select('id, title, subject, status, created_at, tutors(profiles!user_id(full_name))')
          .order('created_at', { ascending: false })
          .limit(6),

        supabase.from('reviews')
          .select('id, rating, comment, created_at, profiles(full_name), tutors(profiles!user_id(full_name))')
          .order('created_at', { ascending: false })
          .limit(4),
      ])

      const monthRevenue = (purch ?? []).reduce((s, p) => s + (p.amount_paid ?? 0), 0)
      setStats({ approvedTutors, pendingCount, students, lessons, openRep, totalRev, monthRevenue })
      setPending(pending ?? [])
      setReports(reports ?? [])
      setLessons(lessonRows ?? [])
      setReviews(reviewRows ?? [])
    }
    load()
  }, [])

  async function approveTutor(id) {
    const tutor = pendingTutors.find(t => t.id === id)
    await supabase.from('tutors').update({ is_approved: true }).eq('id', id)
    // lessons.tutor_id = auth user id, not tutors.id
    if (tutor?.user_id) {
      await supabase.from('lessons')
        .update({ status: 'active' })
        .eq('tutor_id', tutor.user_id)
        .eq('status', 'draft')
    }
    // FIX 2: include admin_id in audit log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'approve_tutor',
      target_type: 'tutor',
      target_id:   id,
    })
    setPending(p => p.filter(t => t.id !== id))
    setStats(s => ({ ...s, pendingCount: (s.pendingCount ?? 1) - 1 }))
  }

  async function rejectTutor(id) {
    const reason = window.prompt('Rejection reason (optional):')
    if (reason === null) return   // user cancelled the prompt
    await supabase.from('tutors')
      .update({ rejection_reason: reason || 'Application not approved' })
      .eq('id', id)
    // FIX 2: include admin_id in audit log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'reject_tutor',
      target_type: 'tutor',
      target_id:   id,
      meta:        { reason: reason || 'Application not approved' },
    })
    setPending(p => p.filter(t => t.id !== id))
    setStats(s => ({ ...s, pendingCount: (s.pendingCount ?? 1) - 1 }))
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6">

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Approved tutors"   value={stats.approvedTutors} sub="active"      href="/tutors"        />
          <Stat label="Students"          value={stats.students}        sub="registered"  href="/users"         />
          <Stat label="Active lessons"    value={stats.lessons}         sub="on platform" href="/tutors"        />
          <Stat label="Total reviews"     value={stats.totalRev}        sub="submitted"   href="/reviews"       />
          <Stat label="Pending approvals" value={stats.pendingCount}    sub="need review" href="/registrations"
            alert={(stats.pendingCount ?? 0) > 0} />
          <Stat label="Open reports"      value={stats.openRep}         sub="unresolved"  href="/reports"
            alert={(stats.openRep ?? 0) > 0} />
        </div>

        {/* Month revenue banner */}
        <div className="rounded-xl px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' }}>
          <div>
            <div className="text-xs opacity-60 mb-0.5 uppercase tracking-wide">Revenue — last 30 days</div>
            <div className="font-serif text-3xl" style={{ color: 'var(--accent-lit)' }}>
              K{(stats.monthRevenue ?? 0).toLocaleString()}
            </div>
          </div>
          <Link href="/analytics"
            className="text-sm px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--sidebar-text)' }}>
            View analytics →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Pending approvals */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-base" style={{ color: 'var(--primary)' }}>Pending approvals</h2>
              <Link href="/registrations" className="text-xs" style={{ color: 'var(--primary-lit)' }}>All →</Link>
            </div>
            {pendingTutors.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: '#9ca3af' }}>All clear ✓</div>
            ) : pendingTutors.map(t => {
              const name     = t.profiles?.full_name ?? 'Tutor'
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={t.id}
                  className="flex items-center justify-between gap-2 py-2.5 border-b last:border-0"
                  style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: 'var(--green-bg)', color: 'var(--primary-mid)' }}>
                      {initials}
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#111827' }}>{name}</div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>
                        {(t.subjects ?? []).slice(0, 2).join(', ') || 'No subjects'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => approveTutor(t.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                      style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                      ✓
                    </button>
                    <button onClick={() => rejectTutor(t.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Open reports */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-base" style={{ color: 'var(--primary)' }}>Open reports</h2>
              <Link href="/reports" className="text-xs" style={{ color: 'var(--primary-lit)' }}>All →</Link>
            </div>
            {openReports.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: '#9ca3af' }}>No open reports 🟢</div>
            ) : openReports.map(r => (
              <div key={r.id} className="py-2.5 border-b last:border-0"
                style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <span className="text-xs font-medium truncate" style={{ color: '#111827' }}>{r.reason}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                    style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber-text)' }}>
                    {r.reported_type}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#9ca3af' }}>
                  {new Date(r.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>

          {/* Recent reviews */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-base" style={{ color: 'var(--primary)' }}>Recent reviews</h2>
              <Link href="/reviews" className="text-xs" style={{ color: 'var(--primary-lit)' }}>All →</Link>
            </div>
            {recentReviews.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: '#9ca3af' }}>No reviews yet.</div>
            ) : recentReviews.map(r => (
              <div key={r.id} className="py-2.5 border-b last:border-0"
                style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-xs text-amber-500 mb-0.5">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </div>
                <p className="text-xs line-clamp-1" style={{ color: '#4b5563' }}>
                  {r.comment || '(no comment)'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  {r.profiles?.full_name} → {r.tutors?.profiles?.full_name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent lessons table */}
        <div className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-serif text-base" style={{ color: 'var(--primary)' }}>Recent lessons</h2>
            <Link href="/tutors" className="text-xs" style={{ color: 'var(--primary-lit)' }}>Manage →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Title', 'Tutor', 'Subject', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 font-medium" style={{ color: '#9ca3af' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLessons.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-light)' }}
                  className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium truncate max-w-xs" style={{ color: '#111827' }}>{l.title}</td>
                  <td className="px-5 py-3" style={{ color: '#6b7280' }}>{l.tutors?.profiles?.full_name ?? '—'}</td>
                  <td className="px-5 py-3" style={{ color: '#6b7280' }}>{l.subject}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full capitalize"
                      style={{
                        backgroundColor: l.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                        color: l.status === 'active' ? 'var(--green-text)' : 'var(--amber-text)',
                      }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
