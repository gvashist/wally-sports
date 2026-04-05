'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types'
import { formatINR } from '@/lib/razorpay'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key:          string
  amount:       number
  currency:     string
  order_id:     string
  name:         string
  description:  string
  prefill?:     { name?: string; email?: string; contact?: string }
  theme?:       { color?: string }
  handler:      (response: RazorpayResponse) => void
  modal?:       { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
}

const SPORT_FILTERS = [
  { id: 'all',        label: 'All Sports'    },
  { id: 'pickleball', label: '🏓 Pickleball' },
  { id: 'badminton',  label: '🏸 Badminton'  },
]

const TYPE_FILTERS = [
  { id: 'all',        label: 'All Events'  },
  { id: 'tournament', label: 'Tournaments' },
  { id: 'mixer',      label: 'Mixers'      },
  { id: 'open_play',  label: 'Open Play'   },
  { id: 'corporate',  label: 'Corporate'   },
]

const B = {
  forest: '#1B4332',
  green:  '#00AB6A',
  orange: '#E55729',
  beige:  '#F5EDD6',
  cream:  '#F5F0E8',
  navy:   '#151D2A',
}

interface Props {
  events:             Event[]
  isLoggedIn:         boolean
  registeredEventIds: string[]
  initialSport:       string
  initialType:        string
}

export default function EventsClient({
  events, isLoggedIn, registeredEventIds, initialSport, initialType,
}: Props) {
  const router = useRouter()
  const [sport,     setSport]     = useState(initialSport)
  const [type,      setType]      = useState(initialType)
  const [regModal,  setRegModal]  = useState<Event | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = events.filter(e => {
    const matchSport = sport === 'all' || e.sport === sport
    const matchType  = type  === 'all' || e.type  === type
    return matchSport && matchType
  })

  const handleRegister = useCallback(async (
    event: Event,
    ticketType: 'solo' | 'duo',
    duoPartnerName: string
  ) => {
    if (!isLoggedIn) {
      router.push(`/login?redirectTo=/events`)
      return
    }

    setLoading(true)

    try {
      // 1. Create order
      const res = await fetch('/api/events/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id:         event.id,
          ticket_type:      ticketType,
          duo_partner_name: duoPartnerName || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Registration failed', false)
        setLoading(false)
        return
      }

      // 2. Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script    = document.createElement('script')
          script.src      = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload   = () => resolve()
          script.onerror  = () => reject(new Error('Razorpay failed to load'))
          document.body.appendChild(script)
        })
      }

      // 3. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         data.key_id,
        amount:      data.amount,
        currency:    data.currency,
        order_id:    data.order_id,
        name:        'Wally Sports',
        description: event.title,
        theme:       { color: B.forest },
        handler: async (response: RazorpayResponse) => {
          // 4. Verify payment on our server
          const verifyRes = await fetch('/api/events/verify-payment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              payment_id:          data.payment_id,
            }),
          })

          if (verifyRes.ok) {
            setRegModal(null)
            showToast(`You're registered for ${event.title}! Check your email.`)
            router.refresh()
          } else {
            showToast('Payment received but verification failed. Contact support.', false)
          }
          setLoading(false)
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })

      rzp.open()

    } catch (err) {
      console.error(err)
      showToast('Something went wrong. Please try again.', false)
      setLoading(false)
    }
  }, [isLoggedIn, router])

  return (
    <div style={{ paddingTop: 68 }}>
      {/* Page hero */}
      <div style={{ background: B.forest, padding: '64px 28px 52px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(245,237,214,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.green, marginBottom: 10 }}>At Wally</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: B.beige, marginBottom: 12 }}>
            What&apos;s <em style={{ color: B.green }}>On</em>
          </h1>
          <p style={{ color: 'rgba(245,237,214,0.55)', fontSize: 16, maxWidth: 480 }}>
            Pickleball tournaments, badminton opens, mixers, and more.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 80px' }}>
        {/* Sport filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {SPORT_FILTERS.map(f => (
            <FilterPill key={f.id} label={f.label} active={sport === f.id} onClick={() => setSport(f.id)} />
          ))}
        </div>
        {/* Type filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => (
            <FilterPill key={f.id} label={f.label} active={type === f.id} onClick={() => setType(f.id)} />
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏓</div>
            <div style={{ fontSize: 16 }}>No events match that filter right now.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {filtered.map(event => (
              <EventCard
                key={event.id}
                event={event}
                isRegistered={registeredEventIds.includes(event.id)}
                onRegister={() => {
                  if (!isLoggedIn) { router.push('/login?redirectTo=/events'); return }
                  setRegModal(event)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Registration modal */}
      {regModal && (
        <RegistrationModal
          event={regModal}
          loading={loading}
          onClose={() => setRegModal(null)}
          onConfirm={(ticketType, duoPartnerName) => handleRegister(regModal, ticketType, duoPartnerName)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 3000,
          background: toast.ok ? B.forest : '#dc2626',
          color: B.beige, padding: '14px 22px', borderRadius: 14,
          fontSize: 14, fontWeight: 500, maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          borderLeft: `4px solid ${toast.ok ? B.green : '#ff8080'}`,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Event Card ────────────────────────────────────────────────────
function EventCard({ event, isRegistered, onRegister }: {
  event:        Event
  isRegistered: boolean
  onRegister:   () => void
}) {
  const day        = new Date(event.event_date).getDate().toString().padStart(2, '0')
  const month      = new Date(event.event_date).toLocaleString('en-IN', { month: 'short' }).toUpperCase()
  const spotsLeft  = event.capacity - (event.registered_count ?? 0)
  const pct        = ((event.registered_count ?? 0) / event.capacity) * 100
  const urgency    = pct >= 90 ? B.orange : pct >= 70 ? '#f59e0b' : B.forest
  const isBadm     = event.sport === 'badminton'
  const daysAway   = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000)

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e8e4dc', overflow: 'hidden', transition: 'all 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(27,67,50,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}>

      {/* Header */}
      <div style={{ background: isBadm ? '#1a2a1f' : B.forest, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: isBadm ? B.orange : B.green, borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{day}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{month}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Pill label={event.type.replace('_', ' ')} color={B.navy} />
          <Pill label={event.sport} color={isBadm ? B.orange : B.green} />
          {isRegistered && <Pill label="Registered ✓" color={B.green} />}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 22px 22px' }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, marginBottom: 10, color: B.navy }}>{event.title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {event.start_time && <div style={{ fontSize: 13, color: '#666' }}>🕐 {event.start_time} {event.end_time ? `– ${event.end_time}` : ''}</div>}
          {event.level      && <div style={{ fontSize: 13, color: '#666' }}>⭐ {event.level}</div>}
          {event.courts     && <div style={{ fontSize: 13, color: '#666' }}>🏟 {event.courts}</div>}
        </div>

        {/* Spot bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: '#888' }}>{event.registered_count ?? 0}/{event.capacity} registered</span>
            <span style={{ color: urgency, fontWeight: 600 }}>{spotsLeft} left</span>
          </div>
          <div style={{ background: '#e8e4dc', borderRadius: 100, height: 5 }}>
            <div style={{ background: urgency, width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 100 }} />
          </div>
        </div>

        {/* Price + CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0ece4' }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: B.forest }}>{formatINR(event.price_solo)}</div>
            {event.price_duo && <div style={{ fontSize: 11, color: '#888' }}>+1 friend: {formatINR(event.price_duo)}/pp</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {isRegistered ? (
              <Pill label="You&apos;re in ✓" color={B.green} />
            ) : spotsLeft === 0 ? (
              <Pill label="Full" color="#aaa" />
            ) : (
              <button onClick={onRegister} style={btnStyle}> Register</button>
            )}
            <span style={{ fontSize: 11, color: daysAway <= 3 ? B.orange : '#aaa', fontWeight: 600 }}>
              {daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d away`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Registration Modal ────────────────────────────────────────────
function RegistrationModal({ event, loading, onClose, onConfirm }: {
  event:     Event
  loading:   boolean
  onClose:   () => void
  onConfirm: (ticketType: 'solo' | 'duo', duoPartnerName: string) => void
}) {
  const [ticketType,    setTicketType]    = useState<'solo' | 'duo'>('solo')
  const [duoPartner,    setDuoPartner]    = useState('')

  const price = ticketType === 'duo' && event.price_duo
    ? event.price_duo * 2
    : event.price_solo

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(27,67,50,0.85)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(6px)',
    }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: B.navy }}>Register — {event.title}</h2>
          <button onClick={onClose} style={{ background: '#f5f5f3', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Ticket type */}
        {event.price_duo && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { id: 'solo' as const, label: 'Solo',            price: event.price_solo,       sub: 'Just me' },
              { id: 'duo'  as const, label: 'Bring a Friend',  price: event.price_duo * 2,    sub: `${formatINR(event.price_duo!)}/person` },
            ].map(t => (
              <div key={t.id} onClick={() => setTicketType(t.id)} style={{
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${ticketType === t.id ? B.forest : '#ddd8cf'}`,
                background: ticketType === t.id ? `${B.forest}08` : '#fff',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: B.navy }}>{t.label}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: B.forest }}>{formatINR(t.price)}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{t.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Duo partner name */}
        {ticketType === 'duo' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Partner Name</label>
            <input
              value={duoPartner} onChange={e => setDuoPartner(e.target.value)}
              placeholder="Your friend's name"
              style={inputStyle}
            />
          </div>
        )}

        {/* Price summary */}
        <div style={{ background: '#f9f7f4', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: B.navy }}>
            <span>Total</span>
            <span style={{ color: B.forest }}>{formatINR(price)}</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 20 }}>
          Secured by Razorpay · UPI, cards & netbanking accepted
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{ ...btnStyle, background: '#f5f5f3', color: B.navy, flex: 1 }}>Cancel</button>
          <button onClick={() => onConfirm(ticketType, duoPartner)} disabled={loading} style={{ ...btnStyle, flex: 2, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Processing…' : `Pay ${formatINR(price)} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '9px 20px', borderRadius: 100, cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: active ? B.forest : '#fff',
      color:      active ? B.beige  : B.navy,
      border:     `1.5px solid ${active ? B.forest : '#ddd8cf'}`,
      transition: 'all 0.15s',
    }}>{label}</div>
  )
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 100,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      background: color + '18', color, border: `1px solid ${color}33`,
    }}>{label}</span>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '12px 20px', background: B.forest, color: B.beige,
  border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', transition: 'opacity 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#555',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid #ddd',
  borderRadius: 12, fontSize: 14, color: B.navy, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}
