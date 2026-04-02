'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

const DOC_LABELS = {
  national_id:   'National ID / NRC',
  teaching_cert: 'Teaching Certificate',
  degree:        'Degree / Diploma',
  transcript:    'Academic Transcript',
  profile_photo: 'Profile Photo',
  other:         'Other Document',
}

// ── Application detail modal ──────────────────────────────────
function ApplicationModal({ tutor, onClose, onApprove, onReject }) {
  const [tab, setTab]         = useState('overview')
  const [docs, setDocs]       = useState([])
  const [lessons, setLessons] = useState([])
  const [thread, setThread]   = useState([])
  const [msg, setMsg]         = useState('')
  const [sending, setSending] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('tutor_documents').select('*').eq('tutor_id', tutor.id).order('uploaded_at', { ascending: false }),
      supabase.from('lessons').select('id,title,subject,form_level,price,status,cloudflare_video_id,created_at').eq('tutor_id', tutor.id).order('created_at', { ascending: false }),
      supabase.from('application_notes').select('*,profiles(full_name)').eq('tutor_id', tutor.id).order('created_at', { ascending: true }),
    ]).then(([{ data: d }, { data: l }, { data: n }]) => {
      setDocs(d ?? [])
      setLessons(l ?? [])
      setThread(n ?? [])
    })
  }, [tutor.id])

  async function sendNote() {
    if (!msg.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: note } = await supabase.from('application_notes')
      .insert({ tutor_id: tutor.id, author_id: user.id, author_role: 'admin', body: msg.trim() })
      .select('*,profiles(full_name)').single()
    if (note) setThread(t => [...t, note])
    setMsg('')
    setSending(false)
  }

  const name     = tutor.profiles?.full_name ?? 'Tutor'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const TABS = [
    { key: 'overview',   label: 'Overview'                   },
    { key: 'documents',  label: `Docs (${docs.length})`      },
    { key: 'lessons',    label: `Lessons (${lessons.length})` },
    { key: 'notes',      label: `Notes (${thread.length})`   },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' }}>
                {initials}
              </div>
              <div>
                <h2 className="font-serif text-xl" style={{ color: 'var(--primary)' }}>{name}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  Applied {new Date(tutor.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(tutor.subjects ?? []).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ borderColor: 'var(--border)', color: '#6b7280' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-xl flex-shrink-0" style={{ color: '#9ca3af' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="text-xs px-4 py-3 font-medium transition border-b-2"
              style={tab === t.key
                ? { color: 'var(--primary)', borderColor: 'var(--primary)' }
                : { color: '#9ca3af', borderColor: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Qualification',   value: tutor.qualification     || '—' },
                  { label: 'Experience',       value: tutor.years_experience ? `${tutor.years_experience} years` : '—' },
                  { label: 'Location',         value: tutor.location          || '—' },
                  { label: 'Phone',            value: tutor.phone             || '—' },
                  { label: 'Hourly rate',      value: tutor.hourly_rate_kwacha ? `K${tutor.hourly_rate_kwacha}/hr` : '—' },
                  { label: 'Docs uploaded',    value: docs.length                   },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg)' }}>
                    <p className="text-xs mb-0.5" style={{ color: '#9ca3af' }}>{f.label}</p>
                    <p className="text-sm font-medium" style={{ color: '#111827' }}>{f.value}</p>
                  </div>
                ))}
              </div>
              {tutor.bio && (
                <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Bio</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{tutor.bio}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-3">
              {docs.length === 0
                ? <p className="text-sm text-center py-10" style={{ color: '#9ca3af' }}>No documents uploaded.</p>
                : docs.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 rounded-xl"
                      style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#111827' }}>
                            {DOC_LABELS[d.document_type] ?? d.document_type}
                          </p>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>
                            {d.file_name ?? 'Document'} · {new Date(d.uploaded_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                        View →
                      </a>
                    </div>
                  ))
              }
            </div>
          )}

          {tab === 'lessons' && (
            <div className="space-y-3">
              {lessons.length === 0
                ? <p className="text-sm text-center py-10" style={{ color: '#9ca3af' }}>No lessons uploaded yet.</p>
                : lessons.map(l => (
                    <div key={l.id} className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#111827' }}>{l.title}</p>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>{l.subject} · {l.form_level} · K{l.price}</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full capitalize"
                          style={{ backgroundColor: l.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)', color: l.status === 'active' ? 'var(--green-text)' : 'var(--amber-text)' }}>
                          {l.status ?? 'draft'}
                        </span>
                      </div>
                      {l.cloudflare_video_id && (
                        <div style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
                          <iframe
                            src={`https://iframe.cloudflarestream.com/${l.cloudflare_video_id}`}
                            className="w-full h-full"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen title={l.title}
                          />
                        </div>
                      )}
                    </div>
                  ))
              }
            </div>
          )}

          {tab === 'notes' && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex-1 space-y-3 min-h-0">
                {thread.length === 0
                  ? <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>
                      No notes yet. Send a message to the applicant or record internal observations.
                    </p>
                  : thread.map(n => (
                      <div key={n.id}
                        className={`max-w-sm rounded-xl px-4 py-3 ${n.author_role === 'admin' ? 'ml-auto' : ''}`}
                        style={{
                          backgroundColor: n.author_role === 'admin' ? 'var(--primary)' : 'var(--bg)',
                          color: n.author_role === 'admin' ? 'var(--sidebar-text)' : '#374151',
                        }}>
                        <p className="text-xs mb-1" style={{ opacity: 0.6 }}>
                          {n.author_role === 'admin' ? 'Admin' : n.profiles?.full_name} ·{' '}
                          {new Date(n.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm">{n.body}</p>
                      </div>
                    ))
                }
              </div>
              <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <input value={msg} onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNote() } }}
                  placeholder="Add a note or message to applicant…"
                  className="flex-1 text-xs rounded-lg px-3 py-2 outline-none"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
                <button onClick={sendNote} disabled={sending || !msg.trim()}
                  className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>Close</button>
          <div className="flex items-center gap-3">
            {rejecting ? (
              <div className="flex items-center gap-2">
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection…"
                  className="text-xs rounded-lg px-3 py-2 outline-none w-56"
                  style={{ border: '1px solid #fca5a5' }} autoFocus />
                <button onClick={() => { onReject(tutor.id, rejectReason); onClose() }}
                  className="text-xs px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red-text)' }}>
                  Confirm
                </button>
                <button onClick={() => setRejecting(false)} className="text-xs" style={{ color: '#9ca3af' }}>Cancel</button>
              </div>
            ) : (
              <>
                <button onClick={() => setRejecting(true)}
                  className="text-sm px-4 py-2 rounded-lg border"
                  style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                  Reject
                </button>
                <button onClick={() => { onApprove(tutor.id); onClose() }}
                  className="text-sm px-5 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                  Approve tutor ✓
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function RegistrationsPage() {
  const [tab, setTab]           = useState('pending')
  const [tutors, setTutors]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [counts, setCounts]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)

    const [{ count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
      supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('is_approved', false).is('rejection_reason', null),
      supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('is_approved', false).not('rejection_reason', 'is', null),
    ])
    setCounts({ pending: pending ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 })

    let query = supabase
      .from('tutors')
      .select('id,is_approved,subjects,hourly_rate_kwacha,bio,phone,location,years_experience,qualification,rejection_reason,created_at,profiles(full_name,avatar_url)')
      .order('created_at', { ascending: false })

    if (tab === 'pending')  query = query.eq('is_approved', false).is('rejection_reason', null)
    if (tab === 'approved') query = query.eq('is_approved', true)
    if (tab === 'rejected') query = query.eq('is_approved', false).not('rejection_reason', 'is', null)

    const { data } = await query
    setTutors(data ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function approveTutor(id) {
    await supabase.from('tutors').update({ is_approved: true }).eq('id', id)
    await supabase.from('lessons').update({ status: 'active' }).eq('tutor_id', id).eq('status', 'draft')
    await supabase.from('admin_log').insert({ action: 'approve_tutor', target_type: 'tutor', target_id: id })
    load()
  }

  async function rejectTutor(id, reason) {
    await supabase.from('tutors').update({ rejection_reason: reason || 'Application not approved' }).eq('id', id)
    await supabase.from('admin_log').insert({ action: 'reject_tutor', target_type: 'tutor', target_id: id, meta: { reason } })
    load()
  }

  const filtered = tutors.filter(t =>
    !search || (t.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { key: 'pending',  label: 'Pending review', count: counts.pending  },
    { key: 'approved', label: 'Approved',        count: counts.approved },
    { key: 'rejected', label: 'Rejected',        count: counts.rejected },
  ]

  return (
    <AdminShell>
      <div className="p-6 space-y-5">

        {/* Tab count cards */}
        <div className="grid grid-cols-3 gap-3">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="rounded-xl p-4 text-left transition"
              style={{
                backgroundColor: tab === t.key
                  ? t.key === 'pending' ? 'var(--amber-bg)' : t.key === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)'
                  : 'var(--surface)',
                border: `1px solid ${tab === t.key ? 'var(--border)' : 'var(--border)'}`,
              }}>
              <p className="text-xs font-medium mb-1"
                style={{ color: tab === t.key ? t.key === 'approved' ? 'var(--green-text)' : t.key === 'rejected' ? 'var(--red-text)' : 'var(--amber-text)' : '#9ca3af' }}>
                {t.label}
              </p>
              <p className="font-serif text-3xl font-bold"
                style={{ color: tab === t.key ? t.key === 'approved' ? 'var(--green-text)' : t.key === 'rejected' ? 'var(--red-text)' : 'var(--amber-text)' : 'var(--primary)' }}>
                {t.count ?? 0}
              </p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex justify-end">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', width: 220 }} />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No {tab} applications.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {filtered.map((t, i) => {
              const name     = t.profiles?.full_name ?? 'Tutor'
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={t.id}
                  className="flex items-center justify-between px-5 py-4 gap-4 cursor-pointer hover:bg-gray-50 transition"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                  onClick={() => setSelected(t)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green-text)' }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{name}</p>
                      <p className="text-xs truncate" style={{ color: '#9ca3af' }}>
                        {(t.subjects ?? []).slice(0, 3).join(', ') || 'No subjects listed'}
                        {t.qualification ? ` · ${t.qualification}` : ''}
                      </p>
                      {t.rejection_reason && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--red-text)' }}>
                          ✕ {t.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xs" style={{ color: '#9ca3af' }}>
                      {new Date(t.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>Review →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <ApplicationModal tutor={selected} onClose={() => setSelected(null)}
          onApprove={approveTutor} onReject={rejectTutor} />
      )}
    </AdminShell>
  )
}
