import { createClient } from '@/lib/supabase/server'
import type { Event, EventRegistration } from '@/types'

// ── Fetch all published events ────────────────────────────────────
export async function getPublishedEvents(sport?: string): Promise<Event[]> {
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .eq('is_cancelled', false)
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  if (sport && sport !== 'all') {
    query = query.eq('sport', sport)
  }

  const { data, error } = await query

  if (error) {
    console.error('getPublishedEvents:', error)
    return []
  }

  // Attach registered counts
  const eventsWithCounts = await Promise.all(
    (data || []).map(async (event) => {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'confirmed')

      return { ...event, registered_count: count ?? 0 }
    })
  )

  return eventsWithCounts
}

// ── Fetch single event by ID ──────────────────────────────────────
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) return null

  const { count } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'confirmed')

  return { ...event, registered_count: count ?? 0 }
}

// ── Fetch single event by slug ────────────────────────────────────
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !event) return null

  const { count } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  return { ...event, registered_count: count ?? 0 }
}

// ── Check if user is registered for an event ─────────────────────
export async function getUserRegistration(
  eventId: string,
  userId: string
): Promise<EventRegistration | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .in('status', ['confirmed', 'pending_payment'])
    .maybeSingle()

  return data
}

// ── Get all registrations for an event (admin) ────────────────────
export async function getEventRegistrations(eventId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      user:users (id, full_name, email, phone)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getEventRegistrations:', error)
    return []
  }

  return data || []
}

// ── Get all events for admin ──────────────────────────────────────
export async function getAllEvents(): Promise<Event[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) {
    console.error('getAllEvents:', error)
    return []
  }

  return data || []
}

// ── Get user's registered events ──────────────────────────────────
export async function getUserEvents(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      event:events (*)
    `)
    .eq('user_id', userId)
    .in('status', ['confirmed', 'pending_payment'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserEvents:', error)
    return []
  }

  return data || []
}
