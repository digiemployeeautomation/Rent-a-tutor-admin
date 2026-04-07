// app/api/admin/payout/route.js
// Processes a payout request via MoneyUnify and updates payout_requests table.
// Admin-only — middleware blocks all non-admin sessions before this runs.

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'

const PAYOUT_MIN = 50
const PAYOUT_MAX = 50_000
const MU_TIMEOUT_MS = 30_000

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Rate limit: 10 payout attempts per minute per admin
    const { limited } = await rateLimit(`payout:${user.id}`, 10)
    if (limited) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })

    // Double-check admin role server-side
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.MONEYUNIFY_AUTH_ID) {
      console.error('[admin/payout] MONEYUNIFY_AUTH_ID is not set')
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 500 })
    }

    const { payoutRequestId } = await request.json()
    if (!payoutRequestId) return NextResponse.json({ error: 'Missing payoutRequestId' }, { status: 400 })

    // Load the payout request
    const { data: payout, error: fetchErr } = await supabase
      .from('payout_requests')
      .select('id, amount, phone, status')
      .eq('id', payoutRequestId)
      .single()

    if (fetchErr || !payout) return NextResponse.json({ error: 'Payout request not found' }, { status: 404 })
    if (payout.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

    // Validate amount
    const amount = Number(payout.amount)
    if (isNaN(amount) || amount < PAYOUT_MIN || amount > PAYOUT_MAX) {
      return NextResponse.json({ error: 'Invalid payout amount.' }, { status: 400 })
    }

    // Validate phone number (Zambian mobile format)
    const phone = String(payout.phone).replace(/\s+/g, '')
    if (!/^(09|07)\d{8}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format on payout request.' }, { status: 400 })
    }

    // Idempotency: atomically mark as processing — if already processing, another admin beat us
    const { data: updated, error: updateErr } = await supabase
      .from('payout_requests')
      .update({ status: 'processing', processed_by: user.id })
      .eq('id', payoutRequestId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (updateErr || !updated) {
      return NextResponse.json({ error: 'Payout already being processed.' }, { status: 409 })
    }

    // Call MoneyUnify disbursement API with timeout
    const reference = `RAT-PAYOUT-${payoutRequestId.slice(0, 8).toUpperCase()}`
    const body = new URLSearchParams({
      to_recipient: phone,
      amount:       String(amount),
      auth_id:      process.env.MONEYUNIFY_AUTH_ID,
      reference,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MU_TIMEOUT_MS)

    let muRes
    try {
      muRes = await fetch('https://api.moneyunify.one/payments/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body:    body.toString(),
        signal:  controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      // Network error or timeout — revert to pending so it can be retried
      await supabase.from('payout_requests').update({
        status: 'pending', processed_by: null,
      }).eq('id', payoutRequestId).eq('status', 'processing')

      const isTimeout = fetchError.name === 'AbortError'
      console.error('[admin/payout] MoneyUnify fetch failed:', fetchError.message)
      return NextResponse.json({
        status: 'failed',
        error: isTimeout ? 'Payment gateway timed out. Please retry.' : 'Payment gateway unreachable. Please retry.',
      }, { status: 502 })
    }
    clearTimeout(timeoutId)

    // Validate HTTP response before parsing JSON
    if (!muRes.ok) {
      const errorText = await muRes.text().catch(() => '')
      console.error('[admin/payout] MoneyUnify HTTP error:', muRes.status, errorText.slice(0, 200))

      await supabase.from('payout_requests').update({
        status:      'failed',
        mu_response: { http_status: muRes.status },
        processed_at: new Date().toISOString(),
      }).eq('id', payoutRequestId)

      return NextResponse.json({
        status: 'failed',
        error: 'Payment gateway returned an error. Please contact support.',
      }, { status: 502 })
    }

    let muData
    try {
      muData = await muRes.json()
    } catch {
      console.error('[admin/payout] MoneyUnify returned non-JSON response')
      await supabase.from('payout_requests').update({
        status: 'failed', processed_at: new Date().toISOString(),
      }).eq('id', payoutRequestId)

      return NextResponse.json({
        status: 'failed',
        error: 'Payment gateway returned an invalid response.',
      }, { status: 502 })
    }

    if (muData.isError || !muData.data?.transaction_id) {
      await supabase.from('payout_requests').update({
        status:      'failed',
        mu_response: muData,
        processed_at: new Date().toISOString(),
      }).eq('id', payoutRequestId)

      // Sanitize: never pass raw external API messages to the client
      return NextResponse.json({
        status: 'failed',
        error: 'Disbursement failed. Please verify the phone number and try again.',
      })
    }

    // Success
    await supabase.from('payout_requests').update({
      status:         'completed',
      transaction_id: muData.data.transaction_id,
      mu_response:    muData,
      processed_at:   new Date().toISOString(),
    }).eq('id', payoutRequestId)

    // Log
    await supabase.from('admin_log').insert({
      admin_id:    user.id,
      action:      'process_payout',
      target_type: 'payout_request',
      target_id:   payoutRequestId,
      meta:        { amount: payout.amount, phone: '******' + phone.slice(-4), transaction_id: muData.data.transaction_id },
    })

    return NextResponse.json({ status: 'completed', transactionId: muData.data.transaction_id })

  } catch (err) {
    console.error('[admin/payout]', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
