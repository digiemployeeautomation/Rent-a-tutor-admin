'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'
import { SUBJECTS } from '@/lib/constants'
import { resolveVideoSrc } from '@/lib/utils'

function VideoModal({ lesson, onClose, onFlag, onUnflag }) {
  const [reason, setReason]   = useState(lesson.flag_reason ?? '')
  const [confirm, setConfirm] = useState(false)

  async function handleFlag() {
    if (!confirm) { setConfirm(true); return }
    await onFlag(lesson.id, reason)
    onClose()
  }

  async function handleUnflag() {
    await onUnflag(lesson.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="px-6 py-4 flex justify-between items-start" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>{lesson.title}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{lesson.subject} · {lesson.form_level} · K{lesson.price}</p>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: '#9ca3af' }}>✕</button>
        </div>

        <div style={{ aspectRatio: '16/9', backgroundColor: '#0a0a0a' }}>
          {(() => {
            const { src } = resolveVideoSrc(lesson.cloudflare_video_id)
            if (src) return (
              <iframe src={src} className="w-full h-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen title={lesson.title} />
            )
            return (
              <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#6b7280' }}>
                No video uploaded yet
              </div>
            )
          })()}
        </div>

        <div className="px-6 py-4">
          {lesson.flagged ? (
            <div className="flex items-center justify-between gap-4">
              <div className="rounded-lg px-4 py-3 flex-1" style={{ backgroundColor: 'var(--red-bg)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--red-text)' }}>⚑ Flagged — hidden from students</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--red-text)', opacity: 0.8 }}>{lesson.flag_reason || '—'}</p>
              </div>
              <button onClick={handleUnflag}
                className="text-xs px-4 py-2 rounded-lg border flex-shrink-0"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                Remove flag
              </button>
            </div>
          ) : confirm ? (
            <div className="space-y-3">
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Reason for flagging (shown to tutor)…"
                className="w-full text-xs rounded-lg px-4 py-2.5 outline-none"
                style={{ border: '1px solid #fca5a5' }} autoFocus />
              <div className="flex gap-2">
                <button onClick={handleFlag}
                  className="text-xs px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--red-text)', color: 'white' }}>
                  Confirm — flag & hide lesson
                </button>
                <button onClick={() => setConfirm(false)}
                  className="text-xs px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Flagged lessons are hidden from students until resolved.
              </p>
              <button onClick={handleFlag}
                className="text-xs px-4 py-2 rounded-lg border flex-shrink-0 ml-4"
                style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                ⚑ Flag lesson
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TutorsPage() {
  const [tab, setTab]         = useState('tutors')
  const [tutors, setTutors]   = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [subject, setSubject] = useState('')
  const [lessonFilter, setLessonFilter] = useState('all')
  const [videoLesson, setVideoLesson]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from('tutors')
        // FIX: explicit FK hint — tutors.user_id references profiles.id
        .select('id,user_id,is_featured,badge,verification_status,subjects,hourly_rate_kwacha,avg_rating,total_reviews,created_at,profiles!user_id(full_name)')
        .eq('is_approved', true).order('created_at', { ascending: false }),
      supabase.from('lessons')
        // FIX: explicit FK hint for nested tutor name
        .select('id,title,subject,form_level,price,status,flagged,flag_reason,cloudflare_video_id,purchase_count,created_at,tutor_id,tutors(profiles!user_id(full_name))')
        .order('created_at', { ascending: false }).limit(200),
    ])
    setTutors(t ?? [])
    setLessons(l ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleFeatured(id, current) {
    const { error } = await supabase.from('tutors').update({ is_featured: !current }).eq('id', id)
    if (error) { console.error('[toggleFeatured]', error); return }
    setTutors(prev => prev.map(t => t.id === id ? { ...t, is_featured: !current } : t))
  }

  const BADGE_LABELS = { grey: 'Verified', black: 'Certified' }

  async function setBadge(id, badge) {
    const value = badge || 'none'
    const { error } = await supabase.from('tutors').update({ badge: value }).eq('id', id)
    if (error) { console.error('[setBadge]', error); alert('Failed to update badge.'); return }
    setTutors(prev => prev.map(t => t.id === id ? { ...t, badge: value } : t))

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      value ? 'set_badge' : 'remove_badge',
      target_type: 'tutor',
      target_id:   id,
      meta:        { badge: value },
    })
  }

  async function revokeTutor(id) {
    if (!window.confirm("Revoke this tutor's approval? Their lessons will be hidden.")) return
    const tutor = tutors.find(t => t.id === id)

    const { error: updateErr } = await supabase.from('tutors').update({ is_approved: false }).eq('id', id)
    if (updateErr) { console.error('[revokeTutor]', updateErr); alert('Failed to revoke tutor. Please try again.'); return }

    if (tutor?.user_id) {
      await supabase.from('lessons').update({ status: 'draft' }).eq('tutor_id', tutor.id)
    }

    // FIX: log with admin_id
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'reject_tutor',
      target_type: 'tutor',
      target_id:   id,
      meta:        { reason: 'Approval revoked by admin' },
    })

    setTutors(prev => prev.filter(t => t.id !== id))
  }

  async function flagLesson(id, reason) {
    const { data: { user } } = await supabase.auth.getUser()

    const { error: updateErr } = await supabase.from('lessons').update({
      flagged:     true,
      flag_reason: reason || null,
      flagged_by:  user.id,
      flagged_at:  new Date().toISOString(),
      status:      'draft',
    }).eq('id', id)

    if (updateErr) { console.error('[flagLesson]', updateErr); alert('Failed to flag lesson. Please try again.'); return }

    // FIX: log with admin_id
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'flag_lesson',
      target_type: 'lesson',
      target_id:   id,
      meta:        { flag_reason: reason || null },
    })

    setLessons(prev => prev.map(l => l.id === id ? { ...l, flagged: true, flag_reason: reason, status: 'draft' } : l))
  }

  async function unflagLesson(id) {
    const { error: updateErr } = await supabase.from('lessons').update({
      flagged:     false,
      flag_reason: null,
      status:      'active',
    }).eq('id', id)

    if (updateErr) { console.error('[unflagLesson]', updateErr); alert('Failed to unflag lesson. Please try again.'); return }

    // FIX: log with admin_id
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'unflag_lesson',
      target_type: 'lesson',
      target_id:   id,
    })

    setLessons(prev => prev.map(l => l.id === id ? { ...l, flagged: false, flag_reason: null, status: 'active' } : l))
  }

  const filteredTutors = tutors.filter(t => {
    const name = t.profiles?.full_name ?? ''
    return (!search || name.toLowerCase().includes(search.toLowerCase()))
      && (!subject || (t.subjects ?? []).includes(subject))
  })

  const filteredLessons = lessons.filter(l =>
    (!search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.tutors?.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
    && (!subject || l.subject === subject)
    && (lessonFilter === 'all'
      || (lessonFilter === 'flagged'  && l.flagged)
      || (lessonFilter === 'no_video' && !l.cloudflare_video_id)
      || (lessonFilter === 'draft'    && l.status === 'draft'))
  )

  return (
    <AdminShell>
      <div className="p-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Approved tutors', value: tutors.length },
            { label: 'Featured tutors', value: tutors.filter(t => t.is_featured).length },
            { label: 'Active lessons',  value: lessons.filter(l => l.status === 'active').length },
            { label: 'Flagged lessons', value: lessons.filter(l => l.flagged).length },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9ca3af' }}>{s.label}</p>
              <p className="font-serif text-2xl font-bold" style={{ color: 'var(--primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              {[{ key: 'tutors', label: `Tutors (${tutors.length})` }, { key: 'lessons', label: `Lessons (${lessons.length})` }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="text-xs px-4 py-1.5 rounded-lg transition font-medium"
                  style={tab === t.key ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' } : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'lessons' && (
              <select value={lessonFilter} onChange={e => setLessonFilter(e.target.value)}
                className="text-xs rounded-xl px-3 py-1.5 outline-none"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                <option value="all">All lessons</option>
                <option value="flagged">Flagged</option>
                <option value="no_video">No video</option>
                <option value="draft">Draft</option>
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="text-xs rounded-lg px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <option value="">All subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="text-xs rounded-lg px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', width: 180 }} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : tab === 'tutors' ? (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {filteredTutors.length === 0
              ? <p className="text-sm text-center py-16" style={{ color: '#9ca3af' }}>No tutors found.</p>
              : filteredTutors.map((t, i) => {
                  const name = t.profiles?.full_name ?? 'Tutor'
                  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3.5 gap-4"
                      style={{ borderBottom: i < filteredTutors.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green-text)' }}>{initials}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#111827' }}>
                            {name}
                            {t.badge && t.badge !== 'none' && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green-text)' }}>
                                ✓ {BADGE_LABELS[t.badge] ?? t.badge}
                              </span>
                            )}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#9ca3af' }}>
                            {(t.subjects ?? []).slice(0, 3).join(', ')}
                            {t.avg_rating ? ` · ★ ${t.avg_rating.toFixed(1)}` : ''}
                            {t.hourly_rate_kwacha ? ` · K${t.hourly_rate_kwacha}/hr` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={t.badge ?? 'none'}
                          onChange={e => setBadge(t.id, e.target.value)}
                          className="text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                          style={{
                            border: `1px solid ${t.badge && t.badge !== 'none' ? 'var(--green-text)' : 'var(--border)'}`,
                            backgroundColor: t.badge && t.badge !== 'none' ? 'var(--green-bg)' : 'var(--surface)',
                            color: t.badge && t.badge !== 'none' ? 'var(--green-text)' : '#9ca3af',
                          }}>
                          <option value="none">No badge</option>
                          <option value="grey">✓ Verified</option>
                          <option value="black">✓ Certified</option>
                        </select>
                        <button onClick={() => toggleFeatured(t.id, t.is_featured)}
                          className="text-xs px-3 py-1.5 rounded-lg border transition"
                          style={t.is_featured
                            ? { backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber-text)', color: 'var(--amber-text)' }
                            : { borderColor: 'var(--border)', color: '#9ca3af' }}>
                          {t.is_featured ? '★ Featured' : 'Feature'}
                        </button>
                        <button onClick={() => revokeTutor(t.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border"
                          style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                          Revoke
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Lesson', 'Tutor', 'Subject', 'Purchases', 'Status', ''].map(h =>
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: '#9ca3af' }}>No lessons found.</td></tr>
                  : filteredLessons.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50 transition" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium truncate" style={{ color: '#111827' }}>{l.title}</p>
                          {l.flagged && <p className="text-xs" style={{ color: 'var(--red-text)' }}>⚑ {l.flag_reason || 'Flagged'}</p>}
                          {!l.cloudflare_video_id && <p className="text-xs" style={{ color: '#9ca3af' }}>No video</p>}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#6b7280' }}>{l.tutors?.profiles?.full_name ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: '#6b7280' }}>{l.subject}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--primary)' }}>{l.purchase_count ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full capitalize text-xs"
                            style={{
                              backgroundColor: l.flagged ? 'var(--red-bg)' : l.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                              color:           l.flagged ? 'var(--red-text)' : l.status === 'active' ? 'var(--green-text)' : 'var(--amber-text)',
                            }}>
                            {l.flagged ? 'flagged' : l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setVideoLesson(l)}
                            className="text-xs px-3 py-1.5 rounded-lg border"
                            style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                            {l.cloudflare_video_id ? '▶ Review' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {videoLesson && (
        <VideoModal lesson={videoLesson} onClose={() => setVideoLesson(null)}
          onFlag={flagLesson} onUnflag={unflagLesson} />
      )}
    </AdminShell>
  )
}
