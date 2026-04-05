import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  try {
    const rawBody  = await request.text()
    const signature = request.headers.get('x-razorpay-signature') ?? ''

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const supabase = await createClient()

    // Handle payment captured
    if (event.event === 'payment.captured') {
      const payment   = event.payload.payment.entity
      const orderId   = payment.order_id
      const paymentId = payment.id

      // Find our payment record by Razorpay order ID
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('id, status')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      if (!paymentRecord) {
        console.error('Webhook: payment record not found for order', orderId)
        return NextResponse.json({ received: true })
      }

      // Skip if already processed
      if (paymentRecord.status === 'paid') {
        return NextResponse.json({ received: true })
      }

      // Mark as paid — trigger will activate the registration/pack
      await supabase
        .from('payments')
        .update({
          razorpay_payment_id: paymentId,
          status:              'paid',
        })
        .eq('id', paymentRecord.id)

      console.log('Webhook: payment confirmed for', paymentRecord.id)
    }

    // Handle payment failed
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id

      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', orderId)

      console.log('Webhook: payment failed for order', orderId)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
