'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

export default function ReviewsPage() {
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('reviews')
      .select('id,rating,comment,created_at,flagged,profiles(full_name),tutors(id,profiles(full_name))')
      .order('created_at', { ascending: false }).limit(150)
    if (filter === 'low')     q = q.lte('rating', 2)
    if (filter === 'flagged') q = q.eq('flagged', true)
    const { data } = await q
    setReviews(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function deleteReview(id) {
    if (!window.confirm('Remove this review? This cannot be undone.')) return
    setDeleting(id)

    const { error: deleteErr } = await supabase.from('reviews').delete().eq('id', id)
    if (deleteErr) {
      console.error('[deleteReview]', deleteErr)
      alert(`Failed to delete review: ${deleteErr.message}`)
      setDeleting(null)
      return
    }

    // FIX: include admin_id so NOT NULL constraint is satisfied
    const { data: { user } } = await supabase.auth.getUser()
    const { error: logErr } = await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'delete_review',
      target_type: 'review',
      target_id:   id,
    })
    if (logErr) console.error('[admin_log insert]', logErr)

    setReviews(prev => prev.filter(r => r.id !== id))
    setDeleting(null)
  }

  async function toggleFlag(id, current) {
    const { error } = await supabase.from('reviews').update({ flagged: !current }).eq('id', id)
    if (error) {
      console.error('[toggleFlag]', error)
      return
    }
    setReviews(prev => prev.map(r => r.id === id ? { ...r, flagged: !current } : r))
  }

  const filtered = reviews.filter(r => {
    if (!search) return true
    return [r.profiles?.full_name, r.tutors?.profiles?.full_name, r.comment]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()))
  })

  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n)

  const FILTER_TABS = [
    { key: 'all',     label: `All (${reviews.length})`                            },
    { key: 'low',     label: `Low (${reviews.filter(r => r.rating <= 2).length})` },
    { key: 'flagged', label: `Flagged (${reviews.filter(r => r.flagged).length})` },
  ]

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className="text-xs px-4 py-1.5 rounded-lg transition font-medium"
                style={filter === t.key ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' } : { color: '#6b7280' }}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student, tutor, or comment…"
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', width: 260 }} />
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No reviews found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-4 rounded-xl"
                style={{ backgroundColor: 'var(--surface)', border: `1px solid ${r.flagged ? '#fca5a5' : 'var(--border)'}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-amber-500">{stars(r.rating)}</span>
                    {r.flagged && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red-text)' }}>⚑ Flagged</span>}
                    {r.rating <= 2 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber-text)' }}>Low</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{r.comment || <em style={{ color: '#9ca3af' }}>No comment</em>}</p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    <strong style={{ color: '#6b7280' }}>{r.profiles?.full_name ?? '—'}</strong>
                    {' → '}
                    <strong style={{ color: '#6b7280' }}>{r.tutors?.profiles?.full_name ?? '—'}</strong>
                    {' · '}{new Date(r.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleFlag(r.id, r.flagged)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition"
                    style={r.flagged ? { borderColor: '#fca5a5', color: 'var(--red-text)' } : { borderColor: 'var(--border)', color: '#9ca3af' }}>
                    {r.flagged ? 'Unflag' : '⚑ Flag'}
                  </button>
                  <button onClick={() => deleteReview(r.id)} disabled={deleting === r.id}
                    className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
                    style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                    {deleting === r.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
