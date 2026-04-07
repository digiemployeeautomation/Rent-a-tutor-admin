'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'
import { PAYOUT_STATUS_STYLES } from '@/lib/constants'
import { fmt } from '@/lib/utils'

function PayoutModal({ request, onClose, onProcessed }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  async function processPayout() {
    setLoading(true)
    const res = await fetch('/api/admin/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutRequestId: request.id }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
    if (data.status === 'completed') onProcessed(request.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>Process payout</h2>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>via MoneyUnify mobile money</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[
            { label: 'Tutor',     value: request.tutors?.profiles?.full_name ?? '—' },
            { label: 'Amount',    value: `K${request.amount.toLocaleString()}`       },
            { label: 'Phone',     value: request.phone                               },
            { label: 'Requested', value: fmt(request.requested_at)                   },
          ].map(f => (
            <div key={f.label} className="flex justify-between py-1.5"
              style={{ borderBottom: '1px solid var(--border-light)' }}>
              <span className="text-xs" style={{ color: '#9ca3af' }}>{f.label}</span>
              <span className="text-xs font-medium" style={{ color: '#111827' }}>{f.value}</span>
            </div>
          ))}

          {result && (
            <div className="rounded-lg p-3 mt-2"
              style={{
                backgroundColor: result.status === 'completed' ? 'var(--green-bg)' : 'var(--red-bg)',
                color: result.status === 'completed' ? 'var(--green-text)' : 'var(--red-text)',
              }}>
              <p className="text-xs font-medium">{result.status === 'completed' ? '✓ Payout sent successfully' : '✕ Payout failed'}</p>
              {result.error && <p className="text-xs mt-0.5 opacity-80">{result.error}</p>}
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={processPayout} disabled={loading}
              className="text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
              {loading ? 'Processing…' : 'Send payout →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const [tab, setTab]           = useState('purchases')
  const [purchases, setPurchases] = useState([])
  const [bookings, setBookings]   = useState([])
  const [payouts, setPayouts]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: purch }, { data: books }, { data: payoutRows }] = await Promise.all([
          supabase.from('lesson_purchases')
            .select('id, amount_paid, purchased_at, transaction_id, lessons(title, subject, price), profiles(full_name)')
            .order('purchased_at', { ascending: false }).limit(100),
          supabase.from('bookings')
            .select('id, amount, status, scheduled_at, subject, profiles!student_id(full_name)')
            .order('scheduled_at', { ascending: false }).limit(100),
          // FIX: explicit FK hint for profiles inside tutors
          supabase.from('payout_requests')
            .select('id, amount, phone, status, requested_at, processed_at, tutors(id, profiles!user_id(full_name))')
            .order('requested_at', { ascending: false }).limit(50),
        ])
        setPurchases(purch ?? [])
        setBookings(books ?? [])
        setPayouts(payoutRows ?? [])
      } catch (err) {
        console.error('[payments] load error:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleProcessed(id) {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p))
    setSelected(null)
  }

  const PAYOUT_STATUS = PAYOUT_STATUS_STYLES

  return (
    <AdminShell>
      <div className="p-6 space-y-6">

        {/* Revenue split removed */}

        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1 w-fit" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[
            { key: 'purchases', label: `Purchases (${purchases.length})`                                        },
            { key: 'bookings',  label: `Bookings (${bookings.length})`                                          },
            { key: 'payouts',   label: `Payouts (${payouts.filter(p => p.status === 'pending').length} pending)` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="text-xs px-4 py-1.5 rounded-lg transition font-medium"
              style={tab === t.key
                ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' }
                : { color: '#6b7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i =>
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
          )}</div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>

            {tab === 'purchases' && (
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Lesson', 'Student', 'Date', 'Amount', 'TX ID'].map(h =>
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-xs" style={{ color: '#111827' }}>{p.lessons?.title ?? '—'}</div>
                        <div style={{ color: '#9ca3af' }}>{p.lessons?.subject}</div>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#6b7280' }}>{p.profiles?.full_name ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#9ca3af' }}>{fmt(p.purchased_at)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--primary-lit)' }}>K{p.amount_paid}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#9ca3af', fontSize: 10 }}>
                        {p.transaction_id?.slice(0, 12) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'bookings' && (
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Subject', 'Student', 'Date', 'Status', 'Amount'].map(h =>
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#111827' }}>{b.subject}</td>
                      <td className="px-4 py-3" style={{ color: '#6b7280' }}>{b.profiles?.full_name ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#9ca3af' }}>{fmt(b.scheduled_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full capitalize"
                          style={{ backgroundColor: b.status === 'completed' ? 'var(--green-bg)' : 'var(--amber-bg)', color: b.status === 'completed' ? 'var(--green-text)' : 'var(--amber-text)' }}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--primary-lit)' }}>K{b.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'payouts' && (
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Tutor', 'Phone', 'Amount', 'Requested', 'Status', ''].map(h =>
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {payouts.map(p => {
                    const sc = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending
                    return (
                      <tr key={p.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#111827' }}>{p.tutors?.profiles?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: '#6b7280' }}>{p.phone}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--primary-lit)' }}>K{p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3" style={{ color: '#9ca3af' }}>{fmt(p.requested_at)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full capitalize"
                            style={{ backgroundColor: sc.bg, color: sc.color }}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {p.status === 'pending' && (
                            <button onClick={() => setSelected(p)}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
                              Process →
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selected && (
        <PayoutModal request={selected} onClose={() => setSelected(null)} onProcessed={handleProcessed} />
      )}
    </AdminShell>
  )
}
