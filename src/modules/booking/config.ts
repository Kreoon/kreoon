// Booking Module - Configuration

export const BOOKING_CONFIG = {
  // Feature flags
  enabled: true,

  // Defaults
  defaultDurationMinutes: 30,
  defaultBufferMinutes: 0,
  defaultMinNoticeHours: 24,
  defaultMaxDaysInAdvance: 60,
  defaultTimezone: 'America/Bogota',

  // Limits
  maxEventTypes: 10,
  maxSlotsPerDay: 10,
  maxBookingsPerDay: 50,

  // UI
  defaultColor: '#8B5CF6',
} as const;

/**
 * Verifica si el módulo de booking está habilitado
 */
export function isBookingEnabled(): boolean {
  return BOOKING_CONFIG.enabled;
}
