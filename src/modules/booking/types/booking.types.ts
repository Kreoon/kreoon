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
  created_at: string;
  updated_at: string;
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
