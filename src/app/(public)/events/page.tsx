import { getPublishedEvents } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import EventsClient from './EventsClient'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; type?: string }>
}) {
  const params = await searchParams
  const events = await getPublishedEvents(params.sport)

  // Get current user if logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's registered event IDs
  let registeredEventIds: string[] = []
  if (user) {
    const { data } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending_payment'])

    registeredEventIds = (data || []).map(r => r.event_id)
  }

  return (
    <EventsClient
      events={events}
      isLoggedIn={!!user}
      registeredEventIds={registeredEventIds}
      initialSport={params.sport ?? 'all'}
      initialType={params.type  ?? 'all'}
    />
  )
}
