import Razorpay from 'razorpay'
import crypto from 'crypto'

// Server-side Razorpay instance
export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured')
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

// Create a Razorpay order
export async function createRazorpayOrder(params: {
  amount:     number  // in paise
  receipt:    string  // your internal reference
  notes?:     Record<string, string>
}) {
  const razorpay = getRazorpay()

  const order = await razorpay.orders.create({
    amount:   params.amount,
    currency: 'INR',
    receipt:  params.receipt,
    notes:    params.notes ?? {},
  })

  return order
}

// Verify Razorpay payment signature
export function verifyRazorpaySignature(params: {
  order_id:   string
  payment_id: string
  signature:  string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const body   = `${params.order_id}|${params.payment_id}`

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expected === params.signature
}

// Verify Razorpay webhook signature
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return expected === signature
}

// Format paise to INR string
export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100)
}
