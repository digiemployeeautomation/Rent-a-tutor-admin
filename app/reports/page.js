'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'
import { REPORT_STATUS_STYLES } from '@/lib/constants'

const STATUS = REPORT_STATUS_STYLES

const TYPE_ICONS = { lesson: '📹', tutor: '👤', review: '⭐', booking: '📅', other: '📋' }

function ReportModal({ report, onClose, onUpdate }) {
  const [notes, setNotes]   = useState(report.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function act(status) {
    setSaving(true)
    setError('')
    // FIX: fetch admin user first so admin_id is never missing
    const { data: { user } } = await supabase.auth.getUser()

    const { error: updateErr } = await supabase.from('reports').update({
      status,
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', report.id)

    if (updateErr) {
      console.error('[reports] update error:', updateErr)
      setError('Failed to update report. Please try again.')
      setSaving(false)
      return
    }

    // FIX: include admin_id so NOT NULL constraint is satisfied
    const { error: logErr } = await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      `${status}_report`,
      target_type: 'report',
      target_id:   report.id,
      meta:        { notes: notes || null },
    })
    if (logErr) console.error('[admin_log insert]', logErr)

    onUpdate(report.id, status, notes)
    setSaving(false)
    onClose()
  }

  const sc = STATUS[report.status] ?? STATUS.pending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{TYPE_ICONS[report.reported_type] ?? '📋'}</span>
                <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>{report.reason}</h2>
              </div>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                {new Date(report.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}reported by {report.reporter?.full_name ?? 'Unknown'}
              </p>
            </div>
            <button onClick={onClose} className="text-xl" style={{ color: '#9ca3af' }}>✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'var(--bg)' }}>
              <p className="text-xs mb-0.5" style={{ color: '#9ca3af' }}>Type</p>
              <p className="text-sm capitalize">{report.reported_type}</p>
            </div>
            <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'var(--bg)' }}>
              <p className="text-xs mb-0.5" style={{ color: '#9ca3af' }}>Status</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
            </div>
          </div>

          {report.description && (
            <div>
              <p className="text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Description</p>
              <p className="text-sm leading-relaxed rounded-xl p-4" style={{ backgroundColor: 'var(--bg)', color: '#374151' }}>
                {report.description}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              Admin notes
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Record your investigation notes or actions taken…"
              className="w-full text-xs rounded-xl px-4 py-3 outline-none resize-none"
              style={{ border: '1px solid var(--border)' }} />
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--red-text)' }}>{error}</p>}
        </div>

        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>Cancel</button>
          <div className="flex gap-2">
            {report.status !== 'dismissed' && (
              <button onClick={() => act('dismissed')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>Dismiss</button>
            )}
            {report.status === 'pending' && (
              <button onClick={() => act('under_review')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--blue-text)', color: 'var(--blue-text)' }}>Under review</button>
            )}
            {report.status !== 'resolved' && (
              <button onClick={() => act('resolved')} disabled={saving}
                className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                {saving ? '…' : 'Mark resolved ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('pending')
  const [type, setType]         = useState('')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [counts, setCounts]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const countRes = await Promise.all(
      ['pending','under_review','resolved','dismissed'].map(s =>
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', s)
      )
    )
    const nc = {}
    ;['pending','under_review','resolved','dismissed'].forEach((s, i) => { nc[s] = countRes[i].count ?? 0 })
    setCounts(nc)

    let q = supabase
      .from('reports')
      .select('id,reason,reported_type,reported_id,description,status,admin_notes,created_at,reporter:reporter_id(full_name)')
      .eq('status', status).order('created_at', { ascending: false })
    if (type) q = q.eq('reported_type', type)
    const { data } = await q
    setReports((data ?? []).filter(r => !search || r.reason.toLowerCase().includes(search.toLowerCase())))
    setLoading(false)
  }, [status, type, search])

  useEffect(() => { load() }, [load])

  function handleUpdate(id, newStatus, notes) {
    setReports(prev => prev.filter(r => r.id !== id))
    setCounts(c => ({ ...c, [status]: Math.max(0, (c[status] ?? 0) - 1), [newStatus]: (c[newStatus] ?? 0) + 1 }))
  }

  const STATUS_TABS = [
    { key: 'pending',      label: 'Pending'      },
    { key: 'under_review', label: 'Under review' },
    { key: 'resolved',     label: 'Resolved'     },
    { key: 'dismissed',    label: 'Dismissed'    },
  ]

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-3">
          {STATUS_TABS.map(t => {
            const sc = STATUS[t.key]
            return (
              <button key={t.key} onClick={() => setStatus(t.key)}
                className="rounded-xl p-4 text-left transition"
                style={{ backgroundColor: status === t.key ? sc.bg : 'var(--surface)', border: `1px solid ${status === t.key ? sc.color + '33' : 'var(--border)'}` }}>
                <p className="text-xs font-medium mb-1" style={{ color: sc.color }}>{t.label}</p>
                <p className="font-serif text-3xl font-bold" style={{ color: sc.color }}>{counts[t.key] ?? 0}</p>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <select value={type} onChange={e => setType(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <option value="">All types</option>
            {['tutor','lesson','review','booking','other'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reason…"
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', width: 220 }} />
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No {status} reports.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(r => {
              const sc = STATUS[r.status] ?? STATUS.pending
              return (
                <div key={r.id}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r) } }}
                  className="flex items-start justify-between gap-4 px-5 py-4 rounded-xl cursor-pointer hover:opacity-90 transition"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                  onClick={() => setSelected(r)}>
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[r.reported_type] ?? '📋'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{r.reason}</p>
                      {r.description && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: '#6b7280' }}>{r.description}</p>}
                      <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                        by {r.reporter?.full_name ?? 'Unknown'} · {new Date(r.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-full capitalize" style={{ backgroundColor: sc.bg, color: sc.color }}>
                      {r.reported_type}
                    </span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>Review →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </AdminShell>
  )
}
