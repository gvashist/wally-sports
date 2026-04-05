'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form,    setForm]    = useState({
    full_name: '',
    email:     '',
    phone:     '',
    password:  '',
  })

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone:     form.phone,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to dashboard — middleware will handle unverified state
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoMark}>W</div>
          <div>
            <div style={styles.logoWally}>WALLY</div>
            <div style={styles.logoSports}>Sports</div>
          </div>
        </div>

        <h1 style={styles.heading}>Create your account</h1>
        <p style={styles.sub}>Join the Wally community</p>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name" type="text"     value={form.full_name} onChange={v => set('full_name', v)} placeholder="Rahul Kumar"          required />
          <Field label="Email"     type="email"    value={form.email}     onChange={v => set('email', v)}     placeholder="you@example.com"       required />
          <Field label="Phone"     type="tel"      value={form.phone}     onChange={v => set('phone', v)}     placeholder="9876543210"             required />
          <Field label="Password"  type="password" value={form.password}  onChange={v => set('password', v)}  placeholder="Min. 8 characters"     required />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder} required={required}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:       { minHeight: '100vh', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:       { background: '#fff', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' },
  logo:       { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoMark:   { width: 36, height: 36, background: '#00AB6A', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff' },
  logoWally:  { fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: '#151D2A', lineHeight: '1' },
  logoSports: { fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#00AB6A', lineHeight: '1' },
  heading:    { fontSize: 22, fontWeight: 700, color: '#151D2A', marginBottom: 4 },
  sub:        { fontSize: 14, color: '#888', marginBottom: 28 },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  input:      { width: '100%', padding: '12px 14px', border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, color: '#151D2A', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  btn:        { width: '100%', padding: '14px', background: '#1B4332', color: '#F5EDD6', border: 'none', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error:      { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 },
  footer:     { textAlign: 'center' as const, marginTop: 24, fontSize: 13, color: '#888' },
  link:       { color: '#1B4332', fontWeight: 600, textDecoration: 'none' },
}
