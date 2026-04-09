// ============================================================
//  components/TopicRequestForm.js  —  STANDALONE (Main Site)
//
//  WHERE TO ADD THIS
//  ─────────────────────────────────────────────────────────
//  Option A — Student Dashboard (recommended):
//    In app/dashboard/student/page.js, import and add a
//    "Request a topic" button that opens this as a modal,
//    or render it inline in a new section:
//
//      import TopicRequestForm from '@/components/TopicRequestForm'
//      // Inside your JSX:
//      <TopicRequestForm onSubmitted={() => { /* refresh list etc */ }} />
//
//  Option B — Dedicated page:
//    Create app/request-topic/page.js and render this component
//    as the full page content. Add a link to it in the Navbar
//    for logged-in students.
//
//  REQUIREMENTS
//  ─────────────────────────────────────────────────────────
//  - Run supabase_topic_requests.sql first
//  - User must be logged in (student)
//  - The form POSTs to /api/topic-requests (see api_topic_requests_route.js)
// ============================================================

'use client'
import { useState } from 'react'
import Link from 'next/link'

const SUBJECTS = [
  'Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics',
  'Geography', 'History', 'Civic Education', 'Computer Studies',
  'Additional Mathematics', 'Commerce', 'Principles of Accounts',
  'French', 'Further Mathematics', 'Economics', 'Literature in English',
  'Business Studies', 'Computer Science', 'Accounting',
]

const FORM_LEVELS = [
  'Form 1', 'Form 2', 'Form 3', 'Form 4 (O-Level)',
  'Form 5', 'Form 6 (A-Level)', 'Not sure',
]

const URGENCY_OPTIONS = [
  { value: 'normal',    label: 'Normal',     desc: 'No rush — any time works',      icon: '🟢' },
  { value: 'urgent',    label: 'Urgent',     desc: 'I need this within a few days',  icon: '🟡' },
  { value: 'exam_prep', label: 'Exam prep',  desc: 'Upcoming exam — time sensitive', icon: '🔴' },
]

export default function TopicRequestForm({ onSubmitted, className = '' }) {
  const [subject, setSubject]         = useState('')
  const [topic, setTopic]             = useState('')
  const [formLevel, setFormLevel]     = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency]         = useState('normal')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [submitted, setSubmitted]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject || !topic.trim()) { setError('Please fill in the subject and topic.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/topic-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subject, topic: topic.trim(), formLevel, description: description.trim(), urgency }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
    if (onSubmitted) onSubmitted(data.request)
  }

  if (submitted) {
    return (
      <div className={`bg-white border border-gray-200 rounded-2xl p-8 text-center ${className}`}>
        <div className="text-4xl mb-4">📬</div>
        <h3 className="font-serif text-xl mb-2" style={{ color: 'var(--color-primary)' }}>
          Request sent!
        </h3>
        <p className="text-sm text-gray-500 mb-1">
          Your topic request has been shared with all tutors on the platform.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          You'll be notified as soon as a tutor responds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setSubmitted(false)
              setSubject(''); setTopic(''); setFormLevel('')
              setDescription(''); setUrgency('normal')
            }}
            className="text-sm px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Submit another request
          </button>
          <Link href="/dashboard/student"
            className="text-sm px-5 py-2.5 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--color-btn-bg)', color: 'var(--color-btn-text)' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 ${className}`}>
      <h3 className="font-serif text-xl mb-1" style={{ color: 'var(--color-primary)' }}>
        Request a topic
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Can't find a lesson on what you need? Let tutors know — they'll respond if they can cover it.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Subject <span className="text-red-400">*</span>
          </label>
          <select
            required value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white">
            <option value="">Select a subject…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Specific topic <span className="text-red-400">*</span>
          </label>
          <input
            type="text" required value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Integration by substitution, Long division of polynomials"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">Be as specific as possible so tutors know exactly what you need.</p>
        </div>

        {/* Form level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Form level</label>
          <div className="flex flex-wrap gap-2">
            {FORM_LEVELS.map(f => (
              <button key={f} type="button" onClick={() => setFormLevel(f)}
                className="text-xs px-3 py-1.5 rounded-full border transition"
                style={formLevel === f
                  ? { backgroundColor: 'var(--color-primary)', color: 'var(--surface)', borderColor: 'var(--color-primary)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            More context <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you're struggling with, what you've already tried, or what the lesson should cover…"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 resize-none"
          />
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">How urgent is this?</label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map(u => (
              <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition"
                style={urgency === u.value
                  ? { backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-primary-lit)', color: 'var(--color-primary)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <span className="text-lg">{u.icon}</span>
                <span className="text-xs font-medium">{u.label}</span>
                <span className="text-xs opacity-70">{u.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-btn-bg)', color: 'var(--color-btn-text)' }}>
          {loading ? 'Submitting…' : 'Send request to tutors →'}
        </button>
      </form>
    </div>
  )
}
