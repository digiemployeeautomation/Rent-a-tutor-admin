// ============================================================
//  components/SessionLinkManager.js  —  STANDALONE (Main Site)
//
//  WHERE TO ADD THIS
//  ─────────────────────────────────────────────────────────
//  TUTOR SIDE — in app/dashboard/tutor/sessions/page.js:
//    import { TutorLinkManager } from '@/components/SessionLinkManager'
//    Render inside a confirmed booking card:
//    <TutorLinkManager booking={b} onSaved={(link) => console.log(link)} />
//
//  STUDENT SIDE — in app/dashboard/student/page.js:
//    import { StudentSessionLink } from '@/components/SessionLinkManager'
//    Render inside the upcoming sessions list:
//    <StudentSessionLink booking={b} />
//
//  SMS HOOK — pass onSaved to TutorLinkManager:
//    <TutorLinkManager
//      booking={b}
//      onSaved={async (link) => {
//        await fetch('/api/sms/send', {
//          method: 'POST',
//          body: JSON.stringify({
//            phone:   studentPhone,
//            message: `Your ${b.subject} session link: ${link}. Starts at ${sessionTime}.`
//          })
//        })
//      }}
//    />
//
//  DATABASE — run migration_v3.sql or add these columns manually:
//    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_link   TEXT;
//    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS link_added_at  TIMESTAMPTZ;
//    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent  BOOLEAN DEFAULT FALSE;
//
//  ACCEPTED PLATFORMS
//  Change ALLOWED_LINK_PREFIXES below to add/remove platforms.
//
//  TIME-LOCK
//  Students cannot see the link until UNLOCK_MINUTES_BEFORE the session.
//  Default: 30 minutes. Change the constant below.
// ============================================================

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const UNLOCK_MINUTES_BEFORE = 30

const ALLOWED_LINK_PREFIXES = [
  'https://zoom.us/',
  'https://us02web.zoom.us/',
  'https://meet.google.com/',
  'https://teams.microsoft.com/',
  'https://whereby.com/',
  'https://meet.jit.si/',
]

function isValidLink(url) {
  if (!url) return false
  try { new URL(url) } catch { return false }
  return ALLOWED_LINK_PREFIXES.some(p => url.startsWith(p))
}

function getPlatform(url) {
  if (!url) return null
  if (url.includes('zoom.us'))             return { name: 'Zoom',            icon: '🎥' }
  if (url.includes('meet.google.com'))     return { name: 'Google Meet',     icon: '🔵' }
  if (url.includes('teams.microsoft.com')) return { name: 'Microsoft Teams', icon: '💼' }
  if (url.includes('whereby.com'))         return { name: 'Whereby',         icon: '📹' }
  if (url.includes('meet.jit.si'))         return { name: 'Jitsi Meet',      icon: '🎦' }
  return { name: 'Video call', icon: '📹' }
}

function minsUntil(iso) {
  return (new Date(iso) - new Date()) / 60000
}

// ─────────────────────────────────────────────────────────────
//  PART A  —  Tutor adds/edits the link
// ─────────────────────────────────────────────────────────────
export function TutorLinkManager({ booking, onSaved }) {
  const existingLink = booking.session_link ?? ''
  const [link, setLink]       = useState(existingLink)
  const [editing, setEditing] = useState(!existingLink)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [justSaved, setJustSaved] = useState(false)

  async function handleSave() {
    const trimmed = link.trim()
    if (!isValidLink(trimmed)) {
      setError('Please enter a valid link. Accepted: Zoom, Google Meet, Teams, Whereby, Jitsi.')
      return
    }
    setError('')
    setSaving(true)

    const { error: dbErr } = await supabase
      .from('bookings')
      .update({ session_link: trimmed, link_added_at: new Date().toISOString() })
      .eq('id', booking.id)

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    setSaving(false)
    setEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
    if (onSaved) onSaved(trimmed)
  }

  async function handleRemove() {
    if (!window.confirm('Remove the session link? The student will no longer see it.')) return
    await supabase.from('bookings').update({ session_link: null, link_added_at: null }).eq('id', booking.id)
    setLink('')
    setEditing(true)
    setJustSaved(false)
  }

  const platform = getPlatform(link || existingLink)

  if (!editing && existingLink) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0">{platform?.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700">{platform?.name} link added</p>
              <p className="text-xs text-gray-400 truncate max-w-xs">{existingLink}</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => setEditing(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              Edit
            </button>
            <button onClick={handleRemove}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">
              Remove
            </button>
          </div>
        </div>
        {justSaved && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-primary-lit)' }}>
            ✓ Saved. The student will see this link {UNLOCK_MINUTES_BEFORE} min before the session.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-600 mb-2">
        {existingLink ? 'Update session link' : '+ Add session link'}
      </p>
      <div className="flex gap-2">
        <input
          value={link}
          onChange={e => { setLink(e.target.value); setError('') }}
          placeholder="https://meet.google.com/abc-defg-hij"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-gray-400 font-mono"
        />
        <button onClick={handleSave} disabled={saving || !link.trim()}
          className="text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-btn-bg)', color: 'var(--color-btn-text)' }}>
          {saving ? '…' : 'Save'}
        </button>
        {existingLink && (
          <button onClick={() => { setEditing(false); setLink(existingLink) }}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500">
            Cancel
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      <p className="text-xs text-gray-400 mt-1">
        Accepted platforms: Zoom · Google Meet · Microsoft Teams · Whereby · Jitsi
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  PART B  —  Student views the link (time-locked)
// ─────────────────────────────────────────────────────────────
export function StudentSessionLink({ booking }) {
  if (booking.status !== 'confirmed' || !booking.session_link) return null

  const mins    = minsUntil(booking.scheduled_at)
  const isOver  = mins < -120
  const isOpen  = mins <= UNLOCK_MINUTES_BEFORE

  if (isOver) return null

  const platform = getPlatform(booking.session_link)

  if (!isOpen) {
    const h = Math.floor(mins / 60)
    const m = Math.round(mins % 60)
    const timeStr = h > 0 ? `${h}h ${m}m` : `${Math.round(mins)}min`
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <span className="text-sm">🔒</span>
        <p className="text-xs text-gray-500">
          Session link unlocks in <strong>{timeStr}</strong>
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-primary-lit)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">{platform?.icon ?? '📹'}</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              {platform?.name ?? 'Session'} link ready
            </p>
            <p className="text-xs text-gray-500">Click to join your session</p>
          </div>
        </div>
        <a
          href={booking.session_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-4 py-2 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--color-accent-btn)', color: 'var(--color-accent-btn-text)' }}>
          Join now →
        </a>
      </div>
    </div>
  )
}
