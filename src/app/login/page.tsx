'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

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

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your Wally account</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Email</label>
            <input
              type="email" value={email} placeholder="you@example.com" required
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Password</label>
            <input
              type="password" value={password} placeholder="••••••••" required
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:       { minHeight: '100vh', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:       { background: '#fff', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' },
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
