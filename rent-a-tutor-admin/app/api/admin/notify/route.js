// app/api/admin/notify/route.js
// Called server-side (from Supabase webhooks or other API routes) to send
// high-priority email alerts to admin via Resend.
//
// Trigger this from a Supabase Database Webhook on:
//   - INSERT on tutors (new application)
//   - INSERT on reports (new report)
//
// Webhook → POST https://admin.rentatutor.co.zm/api/admin/notify
// with body: { type: 'new_application' | 'new_report', payload: { ... } }
//
// Secure the webhook with a secret header:
//   Add header  x-webhook-secret: YOUR_SECRET  in Supabase webhook config
//   Set env var WEBHOOK_SECRET=YOUR_SECRET

import { NextResponse } from 'next/server'

const RESEND_API = 'https://api.resend.com/emails'

async function sendEmail({ subject, html }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM ?? 'alerts@rentatutor.co.zm',
      to:   [process.env.ALERT_EMAIL_TO  ?? 'admin@rentatutor.co.zm'],
      subject,
      html,
    }),
  })
  return res.ok
}

export async function POST(request) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const { type, payload } = await request.json()

    if (type === 'new_application') {
      const name    = payload?.record?.profiles?.full_name ?? 'A new tutor'
      const subjects = payload?.record?.subjects?.join(', ') ?? 'not specified'

      await sendEmail({
        subject: `⚡ New tutor application — ${name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#173404;font-family:Georgia,serif;">New Tutor Application</h2>
            <p style="color:#6b7280;">A tutor has submitted an application and is waiting for your review.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Subjects</td><td style="padding:8px 0;">${subjects}</td></tr>
            </table>
            <a href="https://admin.rentatutor.co.zm/registrations"
               style="display:inline-block;background:#27500a;color:#c0dd97;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
              Review application →
            </a>
          </div>`,
      })
    }

    if (type === 'new_report') {
      const reason = payload?.record?.reason ?? 'Unknown reason'
      const rtype  = payload?.record?.reported_type ?? 'unknown'

      await sendEmail({
        subject: `🚨 New report filed — ${reason}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#854f0b;font-family:Georgia,serif;">New Report Filed</h2>
            <p style="color:#6b7280;">A user has filed a report that needs your attention.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Reason</td><td style="padding:8px 0;font-weight:600;">${reason}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Type</td><td style="padding:8px 0;text-transform:capitalize;">${rtype}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Description</td><td style="padding:8px 0;">${payload?.record?.description ?? '—'}</td></tr>
            </table>
            <a href="https://admin.rentatutor.co.zm/reports"
               style="display:inline-block;background:#854f0b;color:#faeeda;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
              Review report →
            </a>
          </div>`,
      })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[admin/notify]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
