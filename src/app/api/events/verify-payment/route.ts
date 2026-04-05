import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !payment_id) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // Verify signature
    const isValid = verifyRazorpaySignature({
      order_id:   razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature:  razorpay_signature,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Update payment — the on_payment_paid trigger will confirm the registration
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature:  razorpay_signature,
        status:              'paid',
      })
      .eq('id', payment_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Payment update error:', updateError)
      return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('POST /api/events/verify-payment:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
