// app/api/topic-requests/route.js  —  Main Site
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'
import { SUBJECTS } from '@/lib/constants'
import { esc } from '@/lib/utils'

const VALID_URGENCY = ['normal', 'urgent', 'exam_prep']
const VALID_LEVELS  = ['Form 1','Form 2','Form 3','Form 4 (O-Level)','Form 5','Form 6 (A-Level)','Not sure','']

async function sendAdminAlert({ studentName, subject, topic, formLevel, urgency, description, requestId }) {
  if (!process.env.RESEND_API_KEY) return

  const urgencyLabel = urgency === 'exam_prep' ? '🔴 EXAM PREP' : urgency === 'urgent' ? '🟡 Urgent' : '🟢 Normal'
  const adminUrl     = `${process.env.NEXT_PUBLIC_SITE_URL?.replace('rentatutor', 'admin.rentatutor') ?? 'https://admin.rentatutor.co.zm'}/topic-requests`

  // FIX: escape every user-supplied value
  const safeStudent  = esc(studentName)
  const safeSubject  = esc(subject)
  const safeTopic    = esc(topic)
  const safeLevel    = esc(formLevel)
  const safeDesc     = esc(description)

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    process.env.ALERT_EMAIL_FROM ?? 'noreply@rentatutor.co.zm',
      to:      [process.env.ALERT_EMAIL_TO  ?? 'admin@rentatutor.co.zm'],
      subject: `📚 New topic request — ${safeSubject}: ${safeTopic}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#173404;font-family:Georgia,serif;margin-bottom:4px;">New Topic Request</h2>
          <p style="color:#6b7280;margin-top:0;">A student needs help with a specific topic.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f6faf2;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;width:120px;">Student</td><td style="padding:10px 16px;font-weight:600;">${safeStudent}</td></tr>
            <tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Subject</td><td style="padding:10px 16px;font-weight:600;">${safeSubject}</td></tr>
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Topic</td><td style="padding:10px 16px;font-weight:600;">${safeTopic}</td></tr>
            <tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Form level</td><td style="padding:10px 16px;">${safeLevel || '—'}</td></tr>
            <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;">Urgency</td><td style="padding:10px 16px;">${urgencyLabel}</td></tr>
            ${safeDesc ? `<tr style="background:#eaf3de;"><td style="padding:10px 16px;color:#9ca3af;font-size:13px;vertical-align:top;">Description</td><td style="padding:10px 16px;">${safeDesc}</td></tr>` : ''}
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

    // Rate limit: 5 requests per minute per user
    const { limited } = rateLimit(`topic-req:${user.id}`, 5)
    if (limited) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles').select('full_name, role').eq('id', user.id).single()

    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit topic requests.' }, { status: 403 })
    }

    const { subject, topic, formLevel, description, urgency } = await request.json()

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

    // Check role — students can only see their own, tutors see open requests, admins see all
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role

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

    // Students can only see their own requests
    if (role === 'student' || mine) {
      query = query.eq('student_id', user.id)
    }
    // Tutors see only open/in_progress requests (not closed/covered)
    else if (role === 'tutor') {
      query = query.in('status', ['open', 'in_progress'])
    }
    // Admins see all — no additional filter

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to load requests.' }, { status: 500 })

    return NextResponse.json({ requests: data ?? [] })

  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
