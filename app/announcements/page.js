'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

const TYPE_STYLES = {
  info:    { label: 'Info',    bg: 'var(--blue-bg)',   color: 'var(--blue-text)',  icon: 'ℹ️' },
  success: { label: 'Success', bg: 'var(--green-bg)',  color: 'var(--green-text)', icon: '✅' },
  warning: { label: 'Warning', bg: 'var(--amber-bg)',  color: 'var(--amber-text)', icon: '⚠️' },
  promo:   { label: 'Promo',   bg: 'var(--red-bg)',    color: 'var(--red-text)',   icon: '🎉' },
}

const AUDIENCE_LABELS = { all: 'Everyone', students: 'Students only', tutors: 'Tutors only' }

function ComposeModal({ onClose, onCreated }) {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [audience, setAudience] = useState('all')
  const [type, setType]         = useState('info')
  const [publish, setPublish]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSave() {
    if (!title.trim() || !body.trim()) { setError('Title and message are required.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('announcements').insert({
      title: title.trim(), body: body.trim(),
      audience, type, published: publish,
      sent_at: publish ? new Date().toISOString() : null,
      created_by: user.id,
    }).select('*').single()

    if (err) { console.error('[announcements]', err); setError('Failed to save announcement. Please try again.'); setSaving(false); return }
    onCreated(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-serif text-lg" style={{ color: 'var(--primary)' }}>New announcement</h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--text-faint)' }}>✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Audience + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Send to</label>
              <select value={audience} onChange={e => setAudience(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                <option value="all">Everyone</option>
                <option value="students">Students only</option>
                <option value="tutors">Tutors only</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Type</label>
              <div className="flex gap-1.5">
                {Object.entries(TYPE_STYLES).map(([k, v]) => (
                  <button key={k} onClick={() => setType(k)} title={v.label}
                    className="flex-1 py-2 rounded-lg text-sm transition"
                    style={{ backgroundColor: type === k ? v.bg : 'var(--bg)', border: `1px solid ${type === k ? v.color + '66' : 'var(--border)'}` }}>
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Platform maintenance this Saturday"
              className="w-full text-sm rounded-lg px-4 py-2.5 outline-none"
              style={{ border: '1px solid var(--border)' }} />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="Write your announcement…"
              className="w-full text-sm rounded-lg px-4 py-2.5 outline-none resize-none"
              style={{ border: '1px solid var(--border)' }} />
          </div>

          {/* Publish toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="sr-only" />
              <div className="w-10 h-5 rounded-full transition"
                style={{ backgroundColor: publish ? 'var(--primary-mid)' : 'var(--border)' }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                  style={{ left: publish ? '1.25rem' : '0.125rem' }} />
              </div>
            </div>
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {publish ? 'Publish immediately' : 'Save as draft'}
            </span>
          </label>

          {error && <p className="text-xs" style={{ color: 'var(--red-text)' }}>{error}</p>}
        </div>

        <div className="px-6 py-4 flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            {saving ? '…' : publish ? 'Publish now →' : 'Save draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [composing, setComposing]         = useState(false)

  useEffect(() => {
    supabase.from('announcements')
      .select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[announcements] load error:', error)
        setAnnouncements(data ?? []); setLoading(false)
      })
      .catch(err => { console.error('[announcements]', err); setLoading(false) })
  }, [])

  async function togglePublished(id, current) {
    const { error } = await supabase.from('announcements').update({ published: !current, sent_at: !current ? new Date().toISOString() : null }).eq('id', id)
    if (error) { console.error('[togglePublished]', error); alert('Failed to update announcement.'); return }
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, published: !current } : a))
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm('Delete this announcement?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) { console.error('[deleteAnnouncement]', error); alert('Failed to delete announcement.'); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <button onClick={() => setComposing(true)}
            className="text-sm px-5 py-2.5 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--primary-mid)', color: 'var(--sidebar-text)' }}>
            + New announcement
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => {
              const ts = TYPE_STYLES[a.type] ?? TYPE_STYLES.info
              return (
                <div key={a.id} className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-1.5 flex items-center gap-2"
                    style={{ backgroundColor: ts.bg }}>
                    <span className="text-sm">{ts.icon}</span>
                    <span className="text-xs font-medium" style={{ color: ts.color }}>{ts.label}</span>
                    <span className="text-xs ml-auto" style={{ color: ts.color, opacity: 0.7 }}>
                      {AUDIENCE_LABELS[a.audience] ?? a.audience}
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{a.title}</p>
                        {!a.published && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-faint)' }}>Draft</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{a.body}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                        {a.sent_at
                          ? `Sent ${new Date(a.sent_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : `Created ${new Date(a.created_at).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => togglePublished(a.id, a.published)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition"
                        style={a.published
                          ? { borderColor: 'var(--border)', color: 'var(--text-faint)' }
                          : { borderColor: 'var(--green-text)', color: 'var(--green-text)' }}>
                        {a.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteAnnouncement(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: '#fca5a5', color: 'var(--red-text)' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {composing && (
        <ComposeModal
          onClose={() => setComposing(false)}
          onCreated={a => setAnnouncements(prev => [a, ...prev])}
        />
      )}
    </AdminShell>
  )
}
