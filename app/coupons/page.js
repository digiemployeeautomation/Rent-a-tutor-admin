'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

function CouponModal({ coupon, onClose, onSaved }) {
  const editing = !!coupon
  const [code,     setCode]     = useState(coupon?.code          ?? '')
  const [desc,     setDesc]     = useState(coupon?.description   ?? '')
  const [dType,    setDType]    = useState(coupon?.discount_type  ?? 'percent')
  const [value,    setValue]    = useState(coupon?.discount_value ?? '')
  const [minAmt,   setMinAmt]   = useState(coupon?.min_amount     ?? '')
  const [maxUses,  setMaxUses]  = useState(coupon?.max_uses       ?? '')
  const [validTo,  setValidTo]  = useState(coupon?.valid_until    ? coupon.valid_until.split('T')[0] : '')
  const [applieTo, setApplieTo] = useState(coupon?.applies_to     ?? 'all')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    setCode(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }

  async function handleSave() {
    if (!code.trim()) { setError('Coupon code is required.'); return }
    if (!value || isNaN(parseFloat(value))) { setError('Discount value is required.'); return }
    if (dType === 'percent' && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
      setError('Percentage must be between 1 and 100.'); return
    }
    setSaving(true)
    setError('')

    const payload = {
      code:           code.trim().toUpperCase(),
      description:    desc.trim() || null,
      discount_type:  dType,
      discount_value: parseFloat(value),
      min_amount:     minAmt ? parseFloat(minAmt) : 0,
      max_uses:       maxUses ? parseInt(maxUses) : null,
      valid_until:    validTo ? new Date(validTo + 'T23:59:59').toISOString() : null,
      applies_to:     applieTo,
    }

    const { data: { user } } = await supabase.auth.getUser()
    let result
    if (editing) {
      const { data, error: e } = await supabase.from('coupons').update(payload).eq('id', coupon.id).select('*').single()
      result = { data, error: e }
    } else {
      const { data, error: e } = await supabase.from('coupons').insert({ ...payload, created_by: user.id }).select('*').single()
      result = { data, error: e }
    }

    if (result.error) { setError(result.error.message); setSaving(false); return }
    onSaved(result.data, editing)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>
            {editing ? 'Edit coupon' : 'New coupon'}
          </h2>
          <button onClick={onClose} className="text-xl" style={{ color: '#9ca3af' }}>✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Code */}
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Coupon code</label>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. BACK2SCHOOL"
                className="flex-1 text-sm font-mono rounded-lg px-4 py-2.5 outline-none uppercase"
                style={{ border: '1px solid var(--border)' }} />
              <button onClick={generateCode}
                className="text-xs px-3 py-2 rounded-lg border flex-shrink-0"
                style={{ borderColor: 'var(--border)', color: '#6b7280' }}>
                Generate
              </button>
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Type</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {[{ v: 'percent', l: '% off' }, { v: 'fixed', l: 'K off' }].map(t => (
                  <button key={t.v} onClick={() => setDType(t.v)}
                    className="flex-1 text-xs py-2.5 font-medium transition"
                    style={dType === t.v ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' } : { color: '#6b7280' }}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                Value {dType === 'percent' ? '(%)' : '(ZMW)'}
              </label>
              <input value={value} onChange={e => setValue(e.target.value)} type="number" min="0"
                placeholder={dType === 'percent' ? '20' : '50'}
                className="w-full text-sm rounded-lg px-4 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)' }} />
            </div>
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Min purchase (K)</label>
              <input value={minAmt} onChange={e => setMinAmt(e.target.value)} type="number" min="0" placeholder="0 (no minimum)"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Max uses</label>
              <input value={maxUses} onChange={e => setMaxUses(e.target.value)} type="number" min="1" placeholder="Unlimited"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Expires</label>
              <input value={validTo} onChange={e => setValidTo(e.target.value)} type="date"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Applies to</label>
              <select value={applieTo} onChange={e => setApplieTo(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                <option value="all">All purchases</option>
                <option value="lessons">Lessons only</option>
                <option value="sessions">Sessions only</option>
                <option value="bundles">Bundles only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Description (internal)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Back to school promo 2026"
              className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
              style={{ border: '1px solid var(--border)' }} />
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--red-text)' }}>{error}</p>}
        </div>

        <div className="px-6 py-4 flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            {saving ? '…' : editing ? 'Save changes' : 'Create coupon'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CouponsPage() {
  const [coupons, setCoupons]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)  // null | 'new' | coupon object

  useEffect(() => {
    supabase.from('coupons').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setCoupons(data ?? []); setLoading(false) })
  }, [])

  async function toggleActive(id, current) {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function deleteCoupon(id) {
    if (!window.confirm('Delete this coupon?')) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) setCoupons(prev => prev.map(c => c.id === saved.id ? saved : c))
    else setCoupons(prev => [saved, ...prev])
  }

  function isExpired(c) {
    return c.valid_until && new Date(c.valid_until) < new Date()
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
            {[
              { label: 'Total coupons', value: coupons.length },
              { label: 'Active',        value: coupons.filter(c => c.is_active && !isExpired(c)).length },
              { label: 'Total uses',    value: coupons.reduce((s, c) => s + (c.uses_count ?? 0), 0) },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#9ca3af' }}>{s.label}</p>
                <p className="font-serif text-2xl font-bold" style={{ color: 'var(--primary)' }}>{s.value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setModal('new')}
            className="text-sm px-5 py-2.5 rounded-lg font-medium flex-shrink-0"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            + New coupon
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No coupons yet.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Code', 'Discount', 'Uses', 'Applies to', 'Expires', 'Status', ''].map(h =>
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#9ca3af' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => {
                  const expired = isExpired(c)
                  const maxed   = c.max_uses && c.uses_count >= c.max_uses
                  const active  = c.is_active && !expired && !maxed
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold" style={{ color: '#111827' }}>{c.code}</p>
                        {c.description && <p style={{ color: '#9ca3af' }}>{c.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--primary)' }}>
                        {c.discount_type === 'percent' ? `${c.discount_value}% off` : `K${c.discount_value} off`}
                        {c.min_amount > 0 && <span style={{ color: '#9ca3af', fontWeight: 'normal' }}> (min K{c.min_amount})</span>}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#6b7280' }}>
                        {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-3 capitalize" style={{ color: '#6b7280' }}>{c.applies_to}</td>
                      <td className="px-4 py-3" style={{ color: expired ? 'var(--red-text)' : '#6b7280' }}>
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: active ? 'var(--green-bg)' : 'var(--amber-bg)', color: active ? 'var(--green-text)' : 'var(--amber-text)' }}>
                          {expired ? 'Expired' : maxed ? 'Maxed out' : active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setModal(c)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border"
                            style={{ borderColor: 'var(--border)', color: '#6b7280' }}>Edit</button>
                          <button onClick={() => toggleActive(c.id, c.is_active)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border"
                            style={{ borderColor: 'var(--border)', color: c.is_active ? 'var(--red-text)' : 'var(--green-text)' }}>
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => deleteCoupon(c.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border"
                            style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <CouponModal
          coupon={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </AdminShell>
  )
}
