import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Must be logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, ticket_type, duo_partner_name } = body

    if (!event_id || !ticket_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .eq('is_published', true)
      .eq('is_cancelled', false)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check capacity
    const { count: registered } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id)
      .eq('status', 'confirmed')

    if ((registered ?? 0) >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    // Check not already registered
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending_payment'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 })
    }

    // Calculate price
    const amount = ticket_type === 'duo' && event.price_duo
      ? event.price_duo * 2
      : event.price_solo

    // Create registration record (pending payment)
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id,
        user_id:          user.id,
        ticket_type,
        duo_partner_name: duo_partner_name || null,
        status:           'pending_payment',
      })
      .select()
      .single()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 })
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id:     user.id,
        amount,
        purpose:     'event_registration',
        reference_id: registration.id,
        status:      'created',
        metadata: {
          event_id,
          event_title: event.title,
          ticket_type,
        },
      })
      .select()
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    // Link payment to registration
    await supabase
      .from('event_registrations')
      .update({ payment_id: payment.id })
      .eq('id', registration.id)

    // Create Razorpay order
    const order = await createRazorpayOrder({
      amount,
      receipt: payment.id,
      notes: {
        event_id,
        event_title:     event.title,
        user_id:         user.id,
        registration_id: registration.id,
        payment_id:      payment.id,
      },
    })

    // Save Razorpay order ID to payment record
    await supabase
      .from('payments')
      .update({
        razorpay_order_id: order.id,
        status: 'pending',
      })
      .eq('id', payment.id)

    return NextResponse.json({
      order_id:        order.id,
      amount:          order.amount,
      currency:        order.currency,
      payment_id:      payment.id,
      registration_id: registration.id,
      key_id:          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })

  } catch (err) {
    console.error('POST /api/events/register:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
