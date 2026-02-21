import { useState, useMemo, useCallback } from 'react';
import { startOfDay, endOfDay, format } from 'date-fns';
import {
  resolvePreset,
  type DateRangePresetKey,
  type DateRangeValue,
} from '@/lib/date-presets';
import { useOrgTimezone } from './useOrgTimezone';

interface UseDateRangePresetOptions {
  /** Default preset on mount. Defaults to 'last_30'. */
  defaultPreset?: DateRangePresetKey;
}

/**
 * Manages date-range state with preset support.
 * Resolves presets using org timezone.
 */
export function useDateRangePreset(opts?: UseDateRangePresetOptions) {
  const timezone = useOrgTimezone();
  const defaultPreset = opts?.defaultPreset ?? 'last_30';

  const [value, setValue] = useState<DateRangeValue>(() => {
    const { from, to } = resolvePreset(defaultPreset, timezone);
    return { preset: defaultPreset, from, to };
  });

  const setPreset = useCallback(
    (key: DateRangePresetKey) => {
      const { from, to } = resolvePreset(key, timezone);
      setValue({ preset: key, from, to });
    },
    [timezone],
  );

  const setCustomRange = useCallback((from: Date, to: Date) => {
    setValue({ preset: 'custom', from: startOfDay(from), to: endOfDay(to) });
  }, []);

  const fromISO = useMemo(() => value.from.toISOString(), [value.from]);
  const toISO = useMemo(() => value.to.toISOString(), [value.to]);

  /** YYYY-MM-DD string for HTML inputs / Supabase date columns */
  const fromDateStr = useMemo(() => format(value.from, 'yyyy-MM-dd'), [value.from]);
  const toDateStr = useMemo(() => format(value.to, 'yyyy-MM-dd'), [value.to]);

  return {
    value,
    setValue,
    setPreset,
    setCustomRange,
    fromDate: value.from,
    toDate: value.to,
    fromISO,
    toISO,
    fromDateStr,
    toDateStr,
  };
}
