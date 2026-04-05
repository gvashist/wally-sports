import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch their profile from our users table
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoMark}>W</div>
          <div>
            <div style={styles.logoWally}>WALLY</div>
            <div style={styles.logoSports}>Sports</div>
          </div>
        </div>

        <div style={styles.badge}>✓ Auth working</div>

        <h1 style={styles.heading}>
          Welcome, {profile?.full_name || user.email}
        </h1>

        <div style={styles.infoGrid}>
          <InfoRow label="Email"    value={user.email ?? '—'} />
          <InfoRow label="User ID"  value={user.id} mono />
          <InfoRow label="Role"     value={profile?.role ?? 'member'} />
          <InfoRow label="Phone"    value={profile?.phone ?? '—'} />
          <InfoRow label="Joined"   value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'} />
        </div>

        <p style={styles.note}>
          This is a placeholder dashboard. The real one is being built next.
        </p>

        <form action="/api/auth/signout" method="POST">
          <button type="submit" style={styles.btn}>Sign Out</button>
        </form>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ece4' }}>
      <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#151D2A', fontFamily: mono ? 'monospace' : 'inherit', maxWidth: 260, wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:       { minHeight: '100vh', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:       { background: '#fff', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' },
  logo:       { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoMark:   { width: 36, height: 36, background: '#00AB6A', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff' },
  logoWally:  { fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: '#151D2A', lineHeight: '1' },
  logoSports: { fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#00AB6A', lineHeight: '1' },
  badge:      { display: 'inline-block', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 100, padding: '4px 14px', fontSize: 12, fontWeight: 600, marginBottom: 16 },
  heading:    { fontSize: 22, fontWeight: 700, color: '#151D2A', marginBottom: 24 },
  infoGrid:   { background: '#f9f7f4', borderRadius: 14, padding: '4px 16px', marginBottom: 24 },
  note:       { fontSize: 13, color: '#aaa', marginBottom: 24, textAlign: 'center' as const },
  btn:        { width: '100%', padding: '12px', background: '#f5f5f3', color: '#151D2A', border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
