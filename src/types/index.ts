// ── Enums (mirror database) ───────────────────────────────────────
export type UserRole       = 'member' | 'coach' | 'manager' | 'admin'
export type SportType      = 'pickleball' | 'badminton' | 'both'
export type EventType      = 'tournament' | 'mixer' | 'open_play' | 'corporate' | 'other'
export type RegStatus      = 'pending_payment' | 'confirmed' | 'cancelled' | 'refunded'
export type TicketType     = 'solo' | 'duo'
export type PackStatus     = 'unpaid' | 'active' | 'exhausted' | 'cancelled'
export type SessionStatus  = 'requested' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
export type PaymentStatus  = 'created' | 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentPurpose = 'event_registration' | 'coaching_pack' | 'corporate_plan'
export type TournFormat    = 'round_robin' | 'knockout' | 'multi_round' | 'dupr_rated'
export type TournStatus    = 'draft' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'
export type ResultStatus   = 'approved' | 'pending' | 'rejected'

// ── User ──────────────────────────────────────────────────────────
export interface User {
  id:          string
  email:       string
  phone:       string | null
  full_name:   string | null
  avatar_url:  string | null
  role:        UserRole
  is_active:   boolean
  created_at:  string
  updated_at:  string
}

// ── Event ─────────────────────────────────────────────────────────
export interface Event {
  id:               string
  location_id:      string | null
  title:            string
  slug:             string | null
  description:      string | null
  type:             EventType
  sport:            SportType
  event_date:       string        // YYYY-MM-DD
  start_time:       string | null // HH:MM
  end_time:         string | null
  level:            string | null
  courts:           string | null
  capacity:         number
  price_solo:       number        // paise
  price_duo:        number | null // paise — null means no duo option
  hero_image_url:   string | null
  is_published:     boolean
  is_cancelled:     boolean
  cancelled_reason: string | null
  is_tournament:    boolean
  tournament_id:    string | null
  created_by:       string | null
  created_at:       string
  updated_at:       string
  // Computed
  registered_count?: number
}

// ── Event Registration ────────────────────────────────────────────
export interface EventRegistration {
  id:               string
  event_id:         string
  user_id:          string
  ticket_type:      TicketType
  duo_partner_name: string | null
  payment_id:       string | null
  status:           RegStatus
  notes:            string | null
  created_at:       string
  updated_at:       string
  // Joins
  event?:           Event
  user?:            User
}

// ── Payment ───────────────────────────────────────────────────────
export interface Payment {
  id:                   string
  user_id:              string
  amount:               number
  currency:             string
  razorpay_order_id:    string | null
  razorpay_payment_id:  string | null
  razorpay_link_id:     string | null
  razorpay_link_url:    string | null
  razorpay_signature:   string | null
  purpose:              PaymentPurpose
  reference_id:         string
  status:               PaymentStatus
  paid_at:              string | null
  metadata:             Record<string, unknown> | null
  created_at:           string
  updated_at:           string
}

// ── Coaching Pack ─────────────────────────────────────────────────
export interface CoachingPack {
  id:                string
  coach_id:          string
  student_id:        string
  label:             string | null
  total_sessions:    number
  sessions_used:     number
  payment_id:        string | null
  razorpay_link_id:  string | null
  razorpay_link_url: string | null
  status:            PackStatus
  expires_at:        string
  price_paise:       number
  created_at:        string
  updated_at:        string
  // Joins
  coach?:            User
  student?:          User
  // Computed
  sessions_remaining?: number
}

// ── Coaching Session ──────────────────────────────────────────────
export interface CoachingSession {
  id:                 string
  pack_id:            string
  coach_id:           string
  student_id:         string
  availability_id:    string | null
  scheduled_date:     string
  start_time:         string | null
  duration_minutes:   number
  status:             SessionStatus
  attended:           boolean
  attended_marked_at: string | null
  notes:              string | null
  rejection_reason:   string | null
  created_at:         string
  updated_at:         string
  // Joins
  coach?:             User
  student?:           User
  pack?:              CoachingPack
}

// ── Leaderboard ───────────────────────────────────────────────────
export interface LeaderboardEntry {
  player_id:     string
  full_name:     string | null
  total_wins:    number
  total_losses:  number
  total_games:   number
  win_rate:      number
  total_points:  number
  monthly_wins:  number
  monthly_points:number
  top3_finishes: number
}

// ── Razorpay ──────────────────────────────────────────────────────
export interface RazorpayOrder {
  id:       string
  amount:   number
  currency: string
  receipt:  string
}

// ── API response helpers ──────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── Forms ─────────────────────────────────────────────────────────
export interface EventRegistrationForm {
  ticket_type:      TicketType
  duo_partner_name: string
  name:             string
  email:            string
  phone:            string
}

export interface CreateEventForm {
  title:        string
  description:  string
  type:         EventType
  sport:        SportType
  event_date:   string
  start_time:   string
  end_time:     string
  level:        string
  courts:       string
  capacity:     number
  price_solo:   number
  price_duo:    number | null
  is_published: boolean
}
