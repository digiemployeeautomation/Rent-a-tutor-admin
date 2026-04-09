// ============================================================
//  components/TopicRequestFeed.js  —  STANDALONE (Main Site)
//
//  WHERE TO ADD THIS
//  ─────────────────────────────────────────────────────────
//  In app/dashboard/tutor/page.js, import and render below
//  the sessions section:
//
//    import TopicRequestFeed from '@/components/TopicRequestFeed'
//    // Inside your JSX:
//    <TopicRequestFeed tutorId={user.id} tutorSubjects={tutorProfile.subjects} />
//
//  REQUIREMENTS
//  ─────────────────────────────────────────────────────────
//  - Run supabase_topic_requests.sql first
//  - User must be logged in as an approved tutor
//  - Props:
//      tutorId       — auth.users id of the current tutor
//      tutorSubjects — string[] of subjects the tutor teaches
// ============================================================

'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const URGENCY_BADGE = {
  normal:    { label: 'Normal',    bg: 'var(--border-light)',                     color: 'var(--text-muted)'                       },
  urgent:    { label: 'Urgent',    bg: 'var(--color-stat-b-bg)',       color: 'var(--color-stat-b-sub)'       },
  exam_prep: { label: 'Exam prep', bg: '#fef2f2',                     color: '#dc2626'                       },
}

const STATUS_BADGE = {
  open:        { label: 'Open',        bg: 'var(--color-stat-a-bg)', color: 'var(--color-badge-text)'  },
  in_progress: { label: 'In progress', bg: 'var(--blue-bg)',                color: 'var(--blue-text)'                  },
  covered:     { label: 'Covered',     bg: 'var(--border-light)',                color: 'var(--text-faint)'                   },
}

function ResponseModal({ request, tutorId, onClose, onResponded }) {
  const [message, setMessage]   = useState('')
  const [rate, setRate]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) { setError('Please write a message to the student.'); return }
    setLoading(true)
    setError('')

    const { error: dbErr } = await supabase
      .from('topic_request_responses')
      .insert({
        request_id:   request.id,
        tutor_id:     tutorId,
        message:      message.trim(),
        proposed_rate: rate ? parseFloat(rate) : null,
      })

    if (dbErr) {
      setError(dbErr.code === '23505' ? 'You have already responded to this request.' : dbErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onResponded(request.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-serif text-lg" style={{ color: 'var(--color-primary)' }}>
                Respond to request
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {request.subject} — {request.topic}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your message to the student <span className="text-red-400">*</span>
            </label>
            <textarea
              required value={message} onChange={e => setMessage(e.target.value)}
              rows={4} autoFocus
              placeholder="Tell the student how you can help. For example: what you'll cover, your approach, when you're available…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Proposed session rate (ZMW) <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">K</span>
              <input
                type="number" min="50" max="5000" value={rate} onChange={e => setRate(e.target.value)}
                placeholder="Leave blank to use your standard rate"
                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="text-sm px-5 py-2.5 rounded-lg font-medium disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-btn-bg)', color: 'var(--color-btn-text)' }}>
              {loading ? 'Sending…' : 'Send response →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TopicRequestFeed({ tutorId, tutorSubjects = [] }) {
  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('my_subjects') // my_subjects | all
  const [responding, setResponding] = useState(null)
  const [responded, setResponded]   = useState(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('topic_requests')
      .select(`
        id, subject, topic, description, form_level,
        urgency, status, response_count, created_at,
        profiles ( full_name )
      `)
      .in('status', ['open', 'in_progress'])
      .order('urgency', { ascending: false })   // exam_prep first
      .order('created_at', { ascending: false })
      .limit(30)

    if (filter === 'my_subjects' && tutorSubjects.length > 0) {
      query = query.in('subject', tutorSubjects)
    }

    const { data } = await query

    // Check which ones this tutor has already responded to
    const ids = (data ?? []).map(r => r.id)
    if (ids.length > 0) {
      const { data: myResponses } = await supabase
        .from('topic_request_responses')
        .select('request_id')
        .eq('tutor_id', tutorId)
        .in('request_id', ids)

      setResponded(new Set((myResponses ?? []).map(r => r.request_id)))
    }

    setRequests(data ?? [])
    setLoading(false)
  }, [filter, tutorId, tutorSubjects])

  useEffect(() => { load() }, [load])

  function handleResponded(requestId) {
    setResponded(prev => new Set([...prev, requestId]))
    setRequests(prev => prev.map(r =>
      r.id === requestId
        ? { ...r, response_count: r.response_count + 1, status: 'in_progress' }
        : r
    ))
  }

  const openCount = requests.filter(r => !responded.has(r.id)).length

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg" style={{ color: 'var(--color-primary)' }}>
            Student topic requests
          </h2>
          {openCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--color-stat-b-bg)', color: 'var(--color-stat-b-sub)' }}>
              {openCount} open
            </span>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {[
            { key: 'my_subjects', label: 'My subjects' },
            { key: 'all',         label: 'All'          },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="text-xs px-3 py-1 rounded-md transition font-medium"
              style={filter === f.key
                ? { backgroundColor: 'var(--color-primary)', color: 'var(--surface)' }
                : { color: 'var(--text-muted)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--border-light)' }} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">
            {filter === 'my_subjects'
              ? 'No open requests for your subjects right now.'
              : 'No open topic requests at the moment.'}
          </p>
          {filter === 'my_subjects' && (
            <button onClick={() => setFilter('all')}
              className="text-xs mt-2 underline" style={{ color: 'var(--color-primary-lit)' }}>
              Show all subjects
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const urgCfg   = URGENCY_BADGE[r.urgency]  ?? URGENCY_BADGE.normal
            const statCfg  = STATUS_BADGE[r.status]    ?? STATUS_BADGE.open
            const hasReplied = responded.has(r.id)
            const ageHours = Math.round((Date.now() - new Date(r.created_at)) / 3600000)
            const ageStr   = ageHours < 1 ? 'Just now'
              : ageHours < 24 ? `${ageHours}h ago`
              : `${Math.round(ageHours / 24)}d ago`

            return (
              <div key={r.id}
                className="rounded-xl p-4 border transition"
                style={{
                  borderColor: hasReplied ? 'var(--border)' : r.urgency === 'exam_prep' ? '#fca5a5' : 'var(--border)',
                  backgroundColor: hasReplied ? 'var(--surface)' : 'var(--surface)',
                  opacity: hasReplied ? 0.75 : 1,
                }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary-mid)' }}>
                        {r.subject}
                      </span>
                      {r.form_level && (
                        <span className="text-xs text-gray-400">{r.form_level}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: urgCfg.bg, color: urgCfg.color }}>
                        {urgCfg.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-800">{r.topic}</h3>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {hasReplied ? (
                      <span className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'var(--color-stat-a-bg)', color: 'var(--color-badge-text)' }}>
                        ✓ Responded
                      </span>
                    ) : (
                      <button onClick={() => setResponding(r)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ backgroundColor: 'var(--color-accent-btn)', color: 'var(--color-accent-btn-text)' }}>
                        Respond →
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-faint)' }}>
                  <span>
                    {r.response_count > 0
                      ? `${r.response_count} tutor${r.response_count !== 1 ? 's' : ''} responded`
                      : 'No responses yet'}
                  </span>
                  <span>{ageStr}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Response modal */}
      {responding && (
        <ResponseModal
          request={responding}
          tutorId={tutorId}
          onClose={() => setResponding(null)}
          onResponded={handleResponded}
        />
      )}
    </div>
  )
}
