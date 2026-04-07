'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'
import { SUBJECTS, URGENCY_STYLES, TOPIC_STATUS_STYLES } from '@/lib/constants'

const URGENCY_STYLE = URGENCY_STYLES
const STATUS_STYLE  = TOPIC_STATUS_STYLES

function RequestDetailModal({ request, onClose, onStatusChange }) {
  const [responses, setResponses] = useState([])
  const [loadingResp, setLoadingResp] = useState(true)
  const [notes, setNotes]   = useState(request.admin_notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('topic_request_responses')
      .select('id, message, proposed_rate, status, created_at, tutors(id, profiles(full_name))')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[topic-request responses]', error)
        setResponses(data ?? []); setLoadingResp(false)
      })
      .catch(err => { console.error('[topic-request responses]', err); setLoadingResp(false) })
  }, [request.id])

  async function updateStatus(status) {
    setSaving(true)
    await supabase.from('topic_requests')
      .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', request.id)
    onStatusChange(request.id, status, notes)
    setSaving(false)
    onClose()
  }

  const urgStyle = URGENCY_STYLE[request.urgency] ?? URGENCY_STYLE.normal
  const statStyle = STATUS_STYLE[request.status] ?? STATUS_STYLE.open

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '88vh' }}>

        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green-text)' }}>
                  {request.subject}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: urgStyle.bg, color: urgStyle.color }}>
                  {urgStyle.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: statStyle.bg, color: statStyle.color }}>
                  {statStyle.label}
                </span>
              </div>
              <h2 className="font-serif text-xl" style={{ color: 'var(--primary)' }}>{request.topic}</h2>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                by {request.student_name ?? 'Student'} · {request.form_level ?? 'Any level'} ·{' '}
                {new Date(request.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} className="text-xl flex-shrink-0" style={{ color: '#9ca3af' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {request.description && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg)' }}>
              <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Student description</p>
              <p className="text-sm" style={{ color: '#374151' }}>{request.description}</p>
            </div>
          )}

          {/* Tutor responses */}
          <div>
            <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              Tutor responses ({responses.length})
            </p>
            {loadingResp ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg)' }} />)}
              </div>
            ) : responses.length === 0 ? (
              <p className="text-xs" style={{ color: '#9ca3af' }}>No tutor has responded yet.</p>
            ) : responses.map(r => (
              <div key={r.id} className="rounded-xl p-4 mb-2"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                    {r.tutors?.profiles?.full_name ?? 'Tutor'}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.proposed_rate && (
                      <span className="text-xs font-medium" style={{ color: 'var(--primary-lit)' }}>
                        K{r.proposed_rate}/hr
                      </span>
                    )}
                    <span className="text-xs" style={{ color: '#9ca3af' }}>
                      {new Date(r.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#4b5563' }}>{r.message}</p>
              </div>
            ))}
          </div>

          {/* Admin notes */}
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              Admin notes (internal)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Internal notes about this request…"
              className="w-full text-xs rounded-xl px-4 py-3 outline-none resize-none"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>Close</button>
          <div className="flex gap-2">
            {request.status !== 'covered' && (
              <button onClick={() => updateStatus('covered')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg border font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                Mark covered
              </button>
            )}
            {request.status !== 'closed' && (
              <button onClick={() => updateStatus('closed')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg border font-medium disabled:opacity-50"
                style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                Close request
              </button>
            )}
            {(request.status === 'covered' || request.status === 'closed') && (
              <button onClick={() => updateStatus('open')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                Reopen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TopicRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('open')
  const [subject, setSubject]   = useState('')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [counts, setCounts]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)

    // Counts per status
    const countResults = await Promise.all(
      ['open','in_progress','covered','closed'].map(s =>
        supabase.from('topic_requests').select('*', { count: 'exact', head: true }).eq('status', s)
      )
    )
    const newCounts = {}
    ;['open','in_progress','covered','closed'].forEach((s, i) => {
      newCounts[s] = countResults[i].count ?? 0
    })
    setCounts(newCounts)

    let query = supabase
      .from('topic_requests')
      .select(`
        id, subject, topic, form_level, urgency, status,
        response_count, admin_notes, created_at,
        profiles!student_id ( full_name )
      `)
      .eq('status', status)
      .order('urgency', { ascending: false })
      .order('created_at', { ascending: false })

    if (subject) query = query.eq('subject', subject)

    const { data } = await query
    setRequests(
      (data ?? []).map(r => ({ ...r, student_name: r.profiles?.full_name }))
        .filter(r => !search || r.topic.toLowerCase().includes(search.toLowerCase()) || r.subject.toLowerCase().includes(search.toLowerCase()))
    )
    setLoading(false)
  }, [status, subject, search])

  useEffect(() => { load() }, [load])

  function handleStatusChange(id, newStatus) {
    setRequests(prev => prev.filter(r => r.id !== id))
    setCounts(c => ({
      ...c,
      [status]:    Math.max(0, (c[status] ?? 0) - 1),
      [newStatus]: (c[newStatus] ?? 0) + 1,
    }))
  }

  const STATUS_TABS = [
    { key: 'open',        label: 'Open'        },
    { key: 'in_progress', label: 'Responding'  },
    { key: 'covered',     label: 'Covered'     },
    { key: 'closed',      label: 'Closed'      },
  ]

  return (
    <AdminShell>
      <div className="p-6 space-y-5">

        {/* Count cards */}
        <div className="grid grid-cols-4 gap-3">
          {STATUS_TABS.map(t => {
            const st = STATUS_STYLE[t.key]
            return (
              <button key={t.key} onClick={() => setStatus(t.key)}
                className="rounded-xl p-4 text-left transition"
                style={{
                  backgroundColor: status === t.key ? st.bg : 'var(--surface)',
                  border: `1px solid ${status === t.key ? st.color + '44' : 'var(--border)'}`,
                }}>
                <div className="text-xs font-medium mb-1" style={{ color: st.color }}>{t.label}</div>
                <div className="font-serif text-3xl font-bold" style={{ color: st.color }}>
                  {counts[t.key] ?? 0}
                </div>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="text-xs border rounded-lg px-3 py-2 outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <option value="">All subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search topic or subject…"
            className="text-xs border rounded-lg px-3 py-2 outline-none flex-1 max-w-xs"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No {status} topic requests.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Topic', 'Subject', 'Student', 'Level', 'Urgency', 'Responses', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const urg = URGENCY_STYLE[r.urgency] ?? URGENCY_STYLE.normal
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer transition"
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                      onClick={() => setSelected(r)}>
                      <td className="px-4 py-3 font-medium max-w-xs" style={{ color: '#111827' }}>
                        <span className="line-clamp-1">{r.topic}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#6b7280' }}>{r.subject}</td>
                      <td className="px-4 py-3" style={{ color: '#6b7280' }}>{r.student_name ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#9ca3af' }}>{r.form_level ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: urg.bg, color: urg.color }}>
                          {urg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: r.response_count > 0 ? 'var(--primary)' : '#9ca3af' }}>
                          {r.response_count}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#9ca3af' }}>
                        {new Date(r.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#9ca3af' }}>View →</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </AdminShell>
  )
}
