'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'
import { fmtDateTime } from '@/lib/utils'

const ACTION_CONFIG = {
  approve_tutor:       { label: 'Approved tutor',   icon: '✓', bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  reject_tutor:        { label: 'Rejected tutor',   icon: '✕', bg: 'var(--red-bg)',    color: 'var(--red-text)'   },
  process_payout:      { label: 'Processed payout', icon: '💳', bg: 'var(--blue-bg)',  color: 'var(--blue-text)'  },
  delete_review:       { label: 'Deleted review',   icon: '🗑', bg: 'var(--red-bg)',    color: 'var(--red-text)'   },
  resolved_report:     { label: 'Resolved report',  icon: '✓', bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  dismissed_report:    { label: 'Dismissed report', icon: '—', bg: 'var(--border-light)',          color: 'var(--text-faint)'            },
  under_review_report: { label: 'Under review',     icon: '👁', bg: 'var(--blue-bg)',  color: 'var(--blue-text)'  },
  flag_lesson:         { label: 'Flagged lesson',   icon: '⚑', bg: 'var(--red-bg)',    color: 'var(--red-text)'   },
  unflag_lesson:       { label: 'Unflagged lesson', icon: '⚑', bg: 'var(--green-bg)', color: 'var(--green-text)' },
}

const ACTION_KEYS = Object.keys(ACTION_CONFIG)

const TARGET_ICONS = {
  tutor:          '👤',
  lesson:         '📹',
  report:         '⚑',
  review:         '★',
  payout_request: '💳',
}

function metaSummary(meta) {
  if (!meta || typeof meta !== 'object') return null
  const parts = []
  if (meta.amount)         parts.push(`K${meta.amount.toLocaleString()}`)
  if (meta.phone)          parts.push(meta.phone)
  if (meta.transaction_id) parts.push(`TX: ${String(meta.transaction_id).slice(0, 10)}…`)
  if (meta.reason)         parts.push(meta.reason)
  if (meta.flag_reason)    parts.push(meta.flag_reason)
  return parts.length ? parts.join(' · ') : null
}

const PAGE = 50

export default function LogsPage() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [totalCount, setTotal]  = useState(0)
  const [page, setPage]         = useState(0)
  const [action, setAction]     = useState('')
  const [targetType, setTarget] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [todayCount, setToday]  = useState(0)

  useEffect(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    supabase
      .from('admin_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .then(({ count }) => setToday(count ?? 0))
      .catch(err => console.error('[logs today count]', err))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)

    let q = supabase
      .from('admin_log')
      .select(
        // FIX: explicit FK hint — admin_log.admin_id references profiles.id
        `id, action, target_type, target_id, meta, created_at,
         profiles!admin_id ( full_name )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)

    if (action)     q = q.eq('action', action)
    if (targetType) q = q.eq('target_type', targetType)
    if (dateFrom)   q = q.gte('created_at', new Date(dateFrom).toISOString())
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      q = q.lte('created_at', end.toISOString())
    }

    const { data, count } = await q
    setLogs(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, action, targetType, dateFrom, dateTo])

  useEffect(() => { setPage(0) }, [action, targetType, dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  function clearFilters() {
    setAction('')
    setTarget('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = action || targetType || dateFrom || dateTo
  const totalPages = Math.ceil(totalCount / PAGE)

  return (
    <AdminShell>
      <div className="p-6 space-y-5">

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total entries', value: totalCount.toLocaleString() },
            { label: 'Actions today', value: todayCount },
            { label: 'Showing',       value: `${Math.min(logs.length, PAGE)} of ${totalCount.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-faint)' }}>
                {s.label}
              </div>
              <div className="font-serif text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={action} onChange={e => setAction(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <option value="">All actions</option>
            {ACTION_KEYS.map(k => (
              <option key={k} value={k}>{ACTION_CONFIG[k].label}</option>
            ))}
          </select>

          <select value={targetType} onChange={e => setTarget(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <option value="">All targets</option>
            {Object.keys(TARGET_ICONS).map(t => (
              <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="text-xs rounded-lg px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }} />
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="text-xs rounded-lg px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }} />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs underline" style={{ color: 'var(--primary-lit)' }}>
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No log entries found.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Timestamp', 'Admin', 'Action', 'Target', 'Details'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-faint)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const cfg        = ACTION_CONFIG[log.action] ?? { label: log.action, icon: '•', bg: 'var(--border-light)', color: 'var(--text-muted)' }
                  const targetIcon = TARGET_ICONS[log.target_type] ?? '📋'
                  const summary    = metaSummary(log.meta)
                  const isLast     = i === logs.length - 1

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition"
                      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-light)' }}>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                        {fmtDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: 'var(--text)' }}>
                          {log.profiles?.full_name ?? 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          <span>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>{targetIcon}</span>
                          <div>
                            <span className="capitalize" style={{ color: 'var(--text-muted)' }}>
                              {log.target_type?.replace('_', ' ') ?? '—'}
                            </span>
                            {log.target_id && (
                              <p className="font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                                {String(log.target_id).slice(0, 8)}…
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                        {summary ?? <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="text-xs px-4 py-2 rounded-lg border disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              ← Prev
            </button>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs px-4 py-2 rounded-lg border disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
