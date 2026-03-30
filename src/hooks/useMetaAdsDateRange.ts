import { useState, useCallback, useMemo } from 'react';
import { resolvePreset, getComparisonRange, type DateRangePresetKey } from '@/lib/date-presets';
import { useOrgTimezone } from '@/hooks/useOrgTimezone';
import type { MetaAdsDateRangeValue } from '@/components/ui/meta-ads-date-range-picker';

interface UseMetaAdsDateRangeOptions {
  defaultPreset?: DateRangePresetKey;
}

export function useMetaAdsDateRange(options?: UseMetaAdsDateRangeOptions) {
  const timezone = useOrgTimezone();
  const defaultPreset = options?.defaultPreset ?? 'last_30';
  const initialRange = resolvePreset(defaultPreset, timezone);

  const [value, setValue] = useState<MetaAdsDateRangeValue>({
    preset: defaultPreset,
    from: initialRange.from,
    to: initialRange.to,
    comparisonEnabled: false,
  });

  const fromISO = useMemo(() => value.from.toISOString(), [value.from]);
  const toISO = useMemo(() => value.to.toISOString(), [value.to]);

  const comparisonRange = useMemo(() => {
    if (!value.comparisonEnabled) return null;
    return getComparisonRange(value.from, value.to);
  }, [value.comparisonEnabled, value.from, value.to]);

  const setComparisonEnabled = useCallback((enabled: boolean) => {
    setValue((prev) => {
      const comp = enabled ? getComparisonRange(prev.from, prev.to) : null;
      return {
        ...prev,
        comparisonEnabled: enabled,
        comparisonFrom: comp?.from,
        comparisonTo: comp?.to,
      };
    });
  }, []);

  const reset = useCallback(() => {
    const range = resolvePreset(defaultPreset, timezone);
    setValue({
      preset: defaultPreset,
      from: range.from,
      to: range.to,
      comparisonEnabled: false,
    });
  }, [defaultPreset, timezone]);

  return {
    value,
    setValue,
    fromISO,
    toISO,
    comparisonEnabled: value.comparisonEnabled ?? false,
    setComparisonEnabled,
    comparisonRange,
    reset,
  };
}
