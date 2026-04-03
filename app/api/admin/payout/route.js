// app/api/admin/payout/route.js
// Processes a payout request via MoneyUnify and updates payout_requests table.
// Admin-only — middleware blocks all non-admin sessions before this runs.

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Double-check admin role server-side
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Mark as processing
    await supabase.from('payout_requests').update({ status: 'processing', processed_by: user.id }).eq('id', payoutRequestId)

    // Call MoneyUnify disbursement API
    // NOTE: Confirm the exact endpoint with MoneyUnify docs — this follows their typical pattern.
    const body = new URLSearchParams({
      to_recipient: payout.phone,
      amount:       String(payout.amount),
      auth_id:      process.env.MONEYUNIFY_AUTH_ID,
      reference:    `RAT-PAYOUT-${payoutRequestId.slice(0, 8).toUpperCase()}`,
    })

    const muRes = await fetch('https://api.moneyunify.one/payments/disburse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body:    body.toString(),
    })

    const muData = await muRes.json()

    if (muData.isError || !muData.data?.transaction_id) {
      await supabase.from('payout_requests').update({
        status:      'failed',
        mu_response: muData,
        processed_at: new Date().toISOString(),
      }).eq('id', payoutRequestId)

      return NextResponse.json({ status: 'failed', error: muData.message ?? 'MoneyUnify disbursement failed.' })
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
      meta:        { amount: payout.amount, phone: payout.phone, transaction_id: muData.data.transaction_id },
    })

    return NextResponse.json({ status: 'completed', transactionId: muData.data.transaction_id })

  } catch (err) {
    console.error('[admin/payout]', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
