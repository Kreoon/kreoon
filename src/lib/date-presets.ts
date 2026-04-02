import {
  startOfDay,
  endOfDay,
  subDays,
  subYears,
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns';

// ── Types ──

export type DateRangePresetKey =
  | 'today'
  | 'yesterday'
  | 'last_7'
  | 'last_15'
  | 'last_30'
  | 'last_90'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface DateRangeValue {
  preset: DateRangePresetKey;
  from: Date;
  to: Date;
}

// ── Presets ──

export interface DateRangePresetDef {
  key: DateRangePresetKey;
  label: string;
}

export const DATE_RANGE_PRESETS: DateRangePresetDef[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'last_7', label: 'Últimos 7 días' },
  { key: 'last_15', label: 'Últimos 15 días' },
  { key: 'last_30', label: 'Últimos 30 días' },
  { key: 'last_90', label: 'Últimos 90 días' },
  { key: 'this_week', label: 'Esta semana' },
  { key: 'last_week', label: 'La semana pasada' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'El mes pasado' },
  { key: 'this_quarter', label: 'Este trimestre' },
  { key: 'this_year', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
];

// ── Resolve ──

/** Convert a timezone-aware "now" to the right reference date. */
function nowInTz(timezone?: string): Date {
  if (!timezone) return new Date();
  // Get the wall-clock date string in the target timezone then parse it
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // "2026-02-20"
  return new Date(parts + 'T12:00:00'); // midday to avoid DST edge
}

/**
 * Resolve a preset key to `{ from, to }` Date objects.
 * For 'custom' returns last_30 as fallback.
 */
export function resolvePreset(
  key: DateRangePresetKey,
  timezone?: string,
): { from: Date; to: Date } {
  const now = nowInTz(timezone);
  const today = startOfDay(now);

  switch (key) {
    case 'today':
      return { from: today, to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { from: y, to: endOfDay(y) };
    }
    case 'last_7':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last_15':
      return { from: startOfDay(subDays(now, 14)), to: endOfDay(now) };
    case 'last_30':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'last_90':
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case 'this_week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case 'last_week': {
      const prevWeekDay = subDays(now, 7);
      return {
        from: startOfWeek(prevWeekDay, { weekStartsOn: 1 }),
        to: endOfWeek(prevWeekDay, { weekStartsOn: 1 }),
      };
    }
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'last_month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
    case 'this_quarter':
      return { from: startOfQuarter(now), to: endOfDay(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfDay(now) };
    case 'custom':
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

/**
 * Get the Spanish label for a preset key.
 */
export function getPresetLabel(key: DateRangePresetKey): string {
  return DATE_RANGE_PRESETS.find(p => p.key === key)?.label ?? 'Personalizado';
}

/**
 * Calculate the previous period of the same length for comparison.
 * E.g. if from=Mar 1 and to=Mar 30 (30 days), returns Feb 1 – Mar 1.
 */
export function getComparisonRange(from: Date, to: Date): { from: Date; to: Date } {
  const days = differenceInCalendarDays(to, from) + 1;
  const compTo = subDays(from, 1);
  const compFrom = subDays(from, days);
  return { from: startOfDay(compFrom), to: endOfDay(compTo) };
}

/**
 * Calculate the same date range from the previous year.
 * E.g. if from=Mar 1 2026 and to=Mar 30 2026, returns Mar 1 2025 – Mar 30 2025.
 */
export function getYearOverYearRange(from: Date, to: Date): { from: Date; to: Date } {
  return { from: startOfDay(subYears(from, 1)), to: endOfDay(subYears(to, 1)) };
}
