// ============================================================
//  app/api/topic-requests/route.js  —  Main Site
//
//  WHERE TO ADD THIS
//  ─────────────────────────────────────────────────────────
//  Drop into: app/api/topic-requests/route.js
//
//  This is called by TopicRequestForm.js when a student submits.
//  It:
//    1. Validates the session (student must be logged in)
//    2. Saves the request to topic_requests table
//    3. Fires an email alert to admin via Resend
//    4. Returns the created request
//
//  REQUIREMENTS
//  ─────────────────────────────────────────────────────────
//  .env.local additions (same as admin site):
//    RESEND_API_KEY=re_your_key
//    ALERT_EMAIL_TO=admin@rentatutor.co.zm
//    ALERT_EMAIL_FROM=noreply@rentatutor.co.zm
//    NEXT_PUBLIC_SITE_URL=https://rentatutor.co.zm
// ============================================================

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const SUBJECTS = [
  'Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics',
  'Geography', 'History', 'Civic Education', 'Computer Studies',
  'Additional Mathematics', 'Commerce', 'Principles of Accounts',
  'French', 'Further Mathematics', 'Economics', 'Literature in English',
  'Business Studies', 'Computer Science', 'Accounting',
]

const VALID_URGENCY  = ['normal', 'urgent', 'exam_prep']
const VALID_LEVELS   = ['Form 1','Form 2','Form 3','Form 4 (O-Level)','Form 5','Form 6 (A-Level)','Not sure','']

async function sendAdminAlert({ studentName, subject, topic, formLevel, urgency, description, requestId }) {
  if (!process.env.RESEND_API_KEY) return   // skip silently if not configured

  const urgencyLabel = urgency === 'exam_prep' ? '🔴 EXAM PREP' : urgency === 'urgent' ? '🟡 Urgent' : '🟢 Normal'
  const adminUrl     = `${process.env.NEXT_PUBLIC_SITE_URL?.replace('rentatutor', 'admin.rentatutor') ?? 'https://admin.rentatutor.co.zm'}/topic-requests`

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    process.env.ALERT_EMAIL_FROM ?? 'noreply@rentatutor.co.zm',
      to:      [process.env.ALERT_EMAIL_TO  ?? 'admin@rentatutor.co.zm'],
      subject: `📚 New topic request — ${subject}: ${topic}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#173404;font-family:Georgia,serif;margin-bottom:4px;">New Topic Request</h2>
          <p style="color:#6b7280;margin-top:0;">A student needs help with a specific topic.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f6faf2;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;width:120px;">Student</td><td style="padding:10px 16px;font-weight:600;">${studentName}</td></tr>
            <tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Subject</td><td style="padding:10px 16px;font-weight:600;">${subject}</td></tr>
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Topic</td><td style="padding:10px 16px;font-weight:600;">${topic}</td></tr>
            <tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Form level</td><td style="padding:10px 16px;">${formLevel || '—'}</td></tr>
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Urgency</td><td style="padding:10px 16px;">${urgencyLabel}</td></tr>
            ${description ? `<tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;vertical-align:top;">Description</td><td style="padding:10px 16px;">${description}</td></tr>` : ''}
          </table>

          <a href="${adminUrl}"
             style="display:inline-block;background:#27500a;color:#c0dd97;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            View in admin console →
          </a>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
            Tutors on the platform have been notified and can respond directly.
            You can close or flag this request from the admin console.
          </p>
        </div>
      `,
    }),
  }).catch(err => console.error('[topic-request alert]', err))
}

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to submit a request.' }, { status: 401 })
    }

    // Confirm user is a student
    const { data: profile } = await supabase
      .from('profiles').select('full_name, role').eq('id', user.id).single()

    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit topic requests.' }, { status: 403 })
    }

    const { subject, topic, formLevel, description, urgency } = await request.json()

    // Validate
    if (!subject || !SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: 'Please select a valid subject.' }, { status: 400 })
    }
    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: 'Please enter a specific topic (at least 3 characters).' }, { status: 400 })
    }
    if (topic.trim().length > 200) {
      return NextResponse.json({ error: 'Topic must be under 200 characters.' }, { status: 400 })
    }
    if (formLevel && !VALID_LEVELS.includes(formLevel)) {
      return NextResponse.json({ error: 'Invalid form level.' }, { status: 400 })
    }
    if (urgency && !VALID_URGENCY.includes(urgency)) {
      return NextResponse.json({ error: 'Invalid urgency.' }, { status: 400 })
    }

    // Rate limit: max 3 open requests per student at a time
    const { count: openCount } = await supabase
      .from('topic_requests')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .in('status', ['open', 'in_progress'])

    if ((openCount ?? 0) >= 3) {
      return NextResponse.json({
        error: 'You already have 3 open requests. Wait for tutors to respond before submitting more.',
      }, { status: 429 })
    }

    // Insert
    const { data: newRequest, error: insertErr } = await supabase
      .from('topic_requests')
      .insert({
        student_id:  user.id,
        subject,
        topic:       topic.trim(),
        form_level:  formLevel  || null,
        description: description?.trim() || null,
        urgency:     urgency    || 'normal',
      })
      .select('*')
      .single()

    if (insertErr) {
      console.error('[topic-requests POST]', insertErr)
      return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 500 })
    }

    // Alert admin (non-blocking)
    sendAdminAlert({
      studentName: profile?.full_name ?? 'A student',
      subject,
      topic:       topic.trim(),
      formLevel:   formLevel || '',
      urgency:     urgency   || 'normal',
      description: description?.trim() || '',
      requestId:   newRequest.id,
    })

    return NextResponse.json({ request: newRequest })

  } catch (err) {
    console.error('[topic-requests POST]', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const mine = searchParams.get('mine') === 'true'

    let query = supabase
      .from('topic_requests')
      .select(`
        id, subject, topic, form_level, urgency, status, response_count, created_at,
        topic_request_responses (
          id, message, proposed_rate, status, created_at,
          tutors ( id, profiles ( full_name, avatar_url ) )
        )
      `)
      .order('created_at', { ascending: false })

    if (mine) query = query.eq('student_id', user.id)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ requests: data ?? [] })

  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
