'use client'
// ── app/bundles/page.js ───────────────────────────────────────
import { useState, useEffect } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

const ALL_SUBJECTS = ['Mathematics','English Language','Biology','Chemistry','Physics','Geography','History','Civic Education','Computer Studies','Additional Mathematics','Commerce','Principles of Accounts','French','Further Mathematics','Economics','Literature in English','Business Studies','Computer Science','Accounting']

function BundleModal({ bundle, onClose, onSaved }) {
  const editing = !!bundle
  const [title,    setTitle]    = useState(bundle?.title         ?? '')
  const [desc,     setDesc]     = useState(bundle?.description   ?? '')
  const [level,    setLevel]    = useState(bundle?.level         ?? '')
  const [subjects, setSubjects] = useState(bundle?.subjects      ?? [])
  const [price,    setPrice]    = useState(bundle?.price         ?? '')
  const [origPx,   setOrigPx]   = useState(bundle?.original_price ?? '')
  const [highlight,setHighlight]= useState(bundle?.highlight     ?? '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  function toggleSubject(s) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!price || isNaN(parseFloat(price))) { setError('Price is required.'); return }
    setSaving(true)
    const payload = {
      title: title.trim(), description: desc.trim() || null,
      level: level.trim() || null, subjects,
      price: parseFloat(price),
      original_price: origPx ? parseFloat(origPx) : null,
      highlight: highlight.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let result
    if (editing) {
      const { data, error: e } = await supabase.from('bundles').update(payload).eq('id', bundle.id).select('*').single()
      result = { data, error: e }
    } else {
      const { data, error: e } = await supabase.from('bundles').insert(payload).select('*').single()
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
      <div className="rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '90vh' }}>
        <div className="px-6 py-5 flex justify-between items-center flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>{editing ? 'Edit bundle' : 'New bundle'}</h2>
          <button onClick={onClose} className="text-xl" style={{ color: '#9ca3af' }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Form 4 Core Bundle"
              className="w-full text-sm rounded-lg px-4 py-2.5 outline-none" style={{ border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Brief description shown to students…"
              className="w-full text-sm rounded-lg px-4 py-2.5 outline-none resize-none" style={{ border: '1px solid var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Level label</label>
              <input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. O-Level · Form 4"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none" style={{ border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Highlight badge</label>
              <input value={highlight} onChange={e => setHighlight(e.target.value)} placeholder="e.g. Most popular"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none" style={{ border: '1px solid var(--border)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Price (K)</label>
              <input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0" placeholder="450"
                className="w-full text-sm rounded-lg px-4 py-2.5 outline-none" style={{ border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Original price (K)</label>
              <input value={origPx} onChange={e => setOrigPx(e.target.value)} type="number" min="0" placeholder="600 (shown as struck)"
                className="w-full text-sm rounded-lg px-4 py-2.5 outline-none" style={{ border: '1px solid var(--border)' }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-2 block uppercase tracking-wide" style={{ color: '#9ca3af' }}>Included subjects</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => toggleSubject(s)}
                  className="text-xs px-2.5 py-1 rounded-full border transition"
                  style={subjects.includes(s)
                    ? { backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }
                    : { borderColor: 'var(--border)', color: '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red-text)' }}>{error}</p>}
        </div>

        <div className="px-6 py-4 flex justify-between flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: '#6b7280' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            {saving ? '…' : editing ? 'Save changes' : 'Create bundle'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  useEffect(() => {
    supabase.from('bundles').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { setBundles(data ?? []); setLoading(false) })
  }, [])

  async function toggleActive(id, current) {
    await supabase.from('bundles').update({ is_active: !current }).eq('id', id)
    setBundles(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
  }

  async function deleteBundle(id) {
    if (!window.confirm('Delete this bundle?')) return
    await supabase.from('bundles').delete().eq('id', id)
    setBundles(prev => prev.filter(b => b.id !== id))
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) setBundles(prev => prev.map(b => b.id === saved.id ? saved : b))
    else setBundles(prev => [...prev, saved])
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <button onClick={() => setModal('new')}
            className="text-sm px-5 py-2.5 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            + New bundle
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : bundles.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>No bundles yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bundles.map(b => (
              <div key={b.id} className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: b.is_active ? 1 : 0.6 }}>
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>{b.title}</p>
                      {b.highlight && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber-text)' }}>
                          {b.highlight}
                        </span>
                      )}
                      {!b.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>Hidden</span>
                      )}
                    </div>
                    {b.level && <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>{b.level}</p>}
                    {b.description && <p className="text-xs line-clamp-1 mb-2" style={{ color: '#6b7280' }}>{b.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(b.subjects ?? []).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ borderColor: 'var(--border)', color: '#6b7280' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-serif text-xl font-bold" style={{ color: 'var(--primary)' }}>K{b.price}</p>
                      {b.original_price && (
                        <p className="text-xs line-through" style={{ color: '#9ca3af' }}>K{b.original_price}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setModal(b)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border"
                        style={{ borderColor: 'var(--border)', color: '#6b7280' }}>Edit</button>
                      <button onClick={() => toggleActive(b.id, b.is_active)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border"
                        style={{ borderColor: 'var(--border)', color: b.is_active ? 'var(--amber-text)' : 'var(--green-text)' }}>
                        {b.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => deleteBundle(b.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border"
                        style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <BundleModal bundle={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </AdminShell>
  )
}
