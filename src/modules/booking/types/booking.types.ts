// Booking Module - Type definitions

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type BookingLocationType = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  no_show: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

export const LOCATION_TYPE_LABELS: Record<BookingLocationType, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  phone: 'Llamada telefónica',
  in_person: 'Presencial',
  custom: 'Otro',
};

export const LOCATION_TYPE_ICONS: Record<BookingLocationType, string> = {
  google_meet: 'Video',
  zoom: 'Video',
  phone: 'Phone',
  in_person: 'MapPin',
  custom: 'Link',
};

export const DAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

export const DAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const DEFAULT_COLORS = [
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
] as const;

// =============================================================================
// ENTITIES
// =============================================================================

export interface CancellationPolicy {
  allow_cancellation: boolean;
  min_hours_before: number;
  allow_reschedule: boolean;
  reschedule_limit: number;
  policy_text: string | null;
}

export interface BookingEventType {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  max_days_in_advance: number;
  max_bookings_per_day: number | null;
  location_type: BookingLocationType;
  location_details: string | null;
  color: string;
  is_active: boolean;
  cancellation_policy?: CancellationPolicy;
  created_at: string;
  updated_at: string;
  // Relations
  custom_questions?: CustomQuestion[];
  reminder_settings?: ReminderSetting[];
}

export interface BookingAvailability {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Domingo, 6=Sábado
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  timezone: string;
  created_at: string;
}

export interface BookingException {
  id: string;
  user_id: string;
  exception_date: string; // YYYY-MM-DD
  is_blocked: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  event_type_id: string;
  host_user_id: string;
  guest_user_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_notes: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  location_type: BookingLocationType;
  location_details: string | null;
  meeting_url: string | null;
  status: BookingStatus;
  confirmation_token: string;
  cancellation_token: string;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  host_notes: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: 'host' | 'guest' | null;
  cancellation_reason: string | null;
  // Relations (populated by join)
  event_type?: BookingEventType;
  host?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface EventTypeInput {
  title: string;
  slug?: string;
  description?: string;
  duration_minutes: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  min_notice_hours?: number;
  max_days_in_advance?: number;
  max_bookings_per_day?: number | null;
  location_type: BookingLocationType;
  location_details?: string;
  color?: string;
  is_active?: boolean;
}

export interface AvailabilityInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone?: string;
}

export interface ExceptionInput {
  exception_date: string;
  is_blocked: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export interface CreateBookingInput {
  event_type_id: string;
  host_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_notes?: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface UpdateBookingInput {
  status?: BookingStatus;
  host_notes?: string;
  meeting_url?: string;
  cancelled_at?: string;
  cancelled_by?: 'host' | 'guest';
  cancellation_reason?: string;
}

// =============================================================================
// UI/COMPONENT TYPES
// =============================================================================

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface DaySchedule {
  day_of_week: number;
  slots: Array<{
    id?: string;
    start_time: string;
    end_time: string;
  }>;
  enabled: boolean;
}

export interface WeeklySchedule {
  [day: number]: DaySchedule;
}

export interface BookingHost {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
  timezone: string;
}

export interface CalendarBooking {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: BookingStatus;
  color: string;
  guest_name: string;
  guest_email: string;
  location_type: BookingLocationType;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface AvailableSlotsResponse {
  date: string;
  slots: TimeSlot[];
}

export interface BookingConfirmation {
  booking: Booking;
  calendar_url: string;
  join_url?: string;
}

// =============================================================================
// CUSTOM QUESTIONS
// =============================================================================

export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';

export interface CustomQuestion {
  id: string;
  event_type_id: string;
  question: string;
  question_type: QuestionType;
  options: string[] | null;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomQuestionInput {
  question: string;
  question_type: QuestionType;
  options?: string[];
  required?: boolean;
  sort_order?: number;
}

export interface QuestionAnswer {
  id: string;
  booking_id: string;
  question_id: string | null;
  question_text: string;
  answer: string | null;
  created_at: string;
}

export interface QuestionAnswerInput {
  question_id: string;
  question_text: string;
  answer: string;
}

// =============================================================================
// BRANDING
// =============================================================================

export interface BookingBranding {
  id: string;
  user_id: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string | null;
  background_color: string;
  welcome_text: string | null;
  footer_text: string | null;
  show_kreoon_branding: boolean;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingBrandingInput {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  background_color?: string;
  welcome_text?: string;
  footer_text?: string;
  show_kreoon_branding?: boolean;
  custom_css?: string;
}

// =============================================================================
// REMINDERS
// =============================================================================

export type ReminderType = 'email' | 'sms';

export interface ReminderSetting {
  id: string;
  event_type_id: string;
  reminder_type: ReminderType;
  hours_before: number;
  enabled: boolean;
  template_subject: string | null;
  template_body: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettingInput {
  reminder_type: ReminderType;
  hours_before: number;
  enabled?: boolean;
  template_subject?: string;
  template_body?: string;
}

export interface ReminderLog {
  id: string;
  booking_id: string;
  reminder_setting_id: string | null;
  reminder_type: ReminderType;
  hours_before: number;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

// =============================================================================
// CALENDAR INTEGRATIONS
// =============================================================================

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  sync_enabled: boolean;
  check_conflicts: boolean;
  create_events: boolean;
  last_sync_at: string | null;
  sync_errors: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventMapping {
  id: string;
  booking_id: string;
  integration_id: string;
  external_event_id: string;
  external_calendar_id: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  created_at: string;
}

export interface CalendarBlockedEvent {
  id: string;
  integration_id: string;
  external_event_id: string;
  title: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  last_synced_at: string;
  created_at: string;
}

// =============================================================================
// WEBHOOKS
// =============================================================================

export type WebhookEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'booking.completed';

export interface BookingWebhook {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  headers: Record<string, string>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingWebhookInput {
  name?: string;
  url: string;
  events?: WebhookEvent[];
  headers?: Record<string, string>;
  active?: boolean;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  booking_id: string | null;
  event_type: WebhookEvent;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  attempt_number: number;
  sent_at: string;
  created_at: string;
}
