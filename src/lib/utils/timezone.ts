import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Format a date in a specific timezone using date-fns format tokens.
 * @example formatDateTz(new Date(), 'dd/MM/yyyy', 'America/Bogota')
 */
export function formatDateTz(date: Date | string | number, fmt: string, tz: string): string {
  return formatInTimeZone(new Date(date), tz, fmt);
}

/**
 * Format a date+time in a specific timezone.
 * Output: "20 feb 2026, 14:30"
 */
export function formatDateTimeTz(date: Date | string | number, tz: string): string {
  return formatInTimeZone(new Date(date), tz, "d MMM yyyy, HH:mm");
}

/**
 * Get the YYYY-MM-DD date key for a date in a specific timezone.
 * This fixes the UTC date-key bug where toISOString().slice(0,10)
 * returns the wrong day for timezones behind UTC.
 */
export function toDateKeyInTz(date: Date | string | number, tz: string): string {
  return formatInTimeZone(new Date(date), tz, 'yyyy-MM-dd');
}

/**
 * Convert a UTC date to a "zoned" Date object for display purposes.
 * The returned Date's local getHours()/getMinutes() match the target timezone.
 */
export function toZoned(date: Date | string | number, tz: string): Date {
  return toZonedTime(new Date(date), tz);
}

/**
 * Convert a zoned Date (user-entered in their org timezone) to UTC.
 * Useful for storing scheduled timestamps in the DB.
 */
export function fromZoned(date: Date | string | number, tz: string): Date {
  return fromZonedTime(new Date(date), tz);
}

/**
 * Calculate calendar days between two dates in a given timezone.
 * Day 1 is the start date itself.
 * @param pausedHours — hours to subtract (e.g. client review delays)
 */
export function calculateDaysInTimezone(
  startDate: Date,
  endDate: Date,
  tz: string,
  pausedHours = 0
): number {
  const startZoned = toZonedTime(startDate, tz);
  const endZoned = toZonedTime(endDate, tz);

  const startDay = new Date(startZoned.getFullYear(), startZoned.getMonth(), startZoned.getDate());
  const endDay = new Date(endZoned.getFullYear(), endZoned.getMonth(), endZoned.getDate());

  const diffTime = endDay.getTime() - startDay.getTime();
  const adjustedTime = diffTime - (pausedHours * 3600000);
  const diffDays = Math.floor(Math.max(0, adjustedTime) / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}
