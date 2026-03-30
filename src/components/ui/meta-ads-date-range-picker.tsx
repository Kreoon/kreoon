import { useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange as DayPickerRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DATE_RANGE_PRESETS,
  resolvePreset,
  getPresetLabel,
  getComparisonRange,
  type DateRangePresetKey,
  type DateRangeValue,
  type DateRangePresetDef,
} from '@/lib/date-presets';
import { useOrgTimezone } from '@/hooks/useOrgTimezone';

// ── Types ──

export interface MetaAdsDateRangeValue extends DateRangeValue {
  comparisonEnabled?: boolean;
  comparisonFrom?: Date;
  comparisonTo?: Date;
}

interface MetaAdsDateRangePickerProps {
  value: MetaAdsDateRangeValue;
  onChange: (value: MetaAdsDateRangeValue) => void;
  presets?: DateRangePresetKey[];
  align?: 'start' | 'center' | 'end';
  className?: string;
}

// ── Meta Ads presets subset (most common for ads) ──

const META_ADS_PRESET_KEYS: DateRangePresetKey[] = [
  'today',
  'yesterday',
  'last_7',
  'last_15',
  'last_30',
  'last_90',
  'this_month',
  'last_month',
  'this_year',
  'custom',
];

// ── Trigger label ──

function formatTriggerLabel(v: MetaAdsDateRangeValue): string {
  if (v.preset !== 'custom') return getPresetLabel(v.preset);
  const f = format(v.from, 'dd MMM', { locale: es });
  const t = format(v.to, 'dd MMM yyyy', { locale: es });
  return `${f} – ${t}`;
}

// ── Inner Body ──

function MetaAdsPickerBody({
  value,
  onChange,
  presetDefs,
  timezone,
  onClose,
}: {
  value: MetaAdsDateRangeValue;
  onChange: (v: MetaAdsDateRangeValue) => void;
  presetDefs: DateRangePresetDef[];
  timezone: string;
  onClose?: () => void;
}) {
  const [draftPreset, setDraftPreset] = useState<DateRangePresetKey>(value.preset);
  const [draftRange, setDraftRange] = useState<{ from: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });
  const [comparisonEnabled, setComparisonEnabled] = useState(value.comparisonEnabled ?? false);

  // Sync draft when external value changes
  useEffect(() => {
    setDraftPreset(value.preset);
    setDraftRange({ from: value.from, to: value.to });
    setComparisonEnabled(value.comparisonEnabled ?? false);
  }, [value.preset, value.from, value.to, value.comparisonEnabled]);

  const comparisonRange = useMemo(() => {
    if (!comparisonEnabled || !draftRange.from || !draftRange.to) return null;
    return getComparisonRange(draftRange.from, draftRange.to);
  }, [comparisonEnabled, draftRange.from, draftRange.to]);

  const handlePresetClick = useCallback(
    (key: DateRangePresetKey) => {
      if (key === 'custom') {
        setDraftPreset('custom');
        return;
      }
      const resolved = resolvePreset(key, timezone);
      setDraftPreset(key);
      setDraftRange({ from: resolved.from, to: resolved.to });
    },
    [timezone],
  );

  const handleCalendarSelect = useCallback((range: DayPickerRange | undefined) => {
    if (!range?.from) return;
    setDraftPreset('custom');
    setDraftRange({ from: range.from, to: range.to });
  }, []);

  const handleApply = useCallback(() => {
    if (!draftRange.to) return;
    const result: MetaAdsDateRangeValue = {
      preset: draftPreset,
      from: draftRange.from,
      to: draftRange.to,
      comparisonEnabled,
    };
    if (comparisonEnabled && comparisonRange) {
      result.comparisonFrom = comparisonRange.from;
      result.comparisonTo = comparisonRange.to;
    }
    onChange(result);
    onClose?.();
  }, [draftPreset, draftRange, comparisonEnabled, comparisonRange, onChange, onClose]);

  const handleCancel = useCallback(() => {
    setDraftPreset(value.preset);
    setDraftRange({ from: value.from, to: value.to });
    setComparisonEnabled(value.comparisonEnabled ?? false);
    onClose?.();
  }, [value, onClose]);

  const handleClear = useCallback(() => {
    const fallback = resolvePreset('last_30', timezone);
    setDraftPreset('last_30');
    setDraftRange({ from: fallback.from, to: fallback.to });
    setComparisonEnabled(false);
  }, [timezone]);

  // Determine default month for the right calendar (one month ahead of left)
  const defaultMonth = useMemo(() => {
    const base = draftRange.from ?? new Date();
    return subDays(base, 0); // left calendar starts here
  }, [draftRange.from]);

  return (
    <div className="flex flex-col sm:flex-row w-full max-w-[680px]">
      {/* Sidebar: Presets */}
      <div className="flex sm:flex-col gap-1 p-3 sm:w-[180px] border-b sm:border-b-0 sm:border-r border-white/10 overflow-x-auto sm:overflow-x-visible bg-white/[0.02] shrink-0">
        <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pb-1">
          Rango de fechas
        </span>
        {presetDefs.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePresetClick(p.key)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors text-left shrink-0',
              draftPreset === p.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main area: Calendars + preview + comparison */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Calendars */}
        <div className="p-3 overflow-x-auto">
          <Calendar
            mode="range"
            selected={{ from: draftRange.from, to: draftRange.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
            defaultMonth={defaultMonth}
          />
        </div>

        {/* Preview + Comparison toggle */}
        <div className="border-t border-white/10 px-4 py-3 space-y-2">
          {/* Date preview */}
          <div className="text-xs text-muted-foreground">
            {draftRange.from && draftRange.to ? (
              <span className="text-foreground font-medium">
                {format(draftRange.from, "d 'de' MMMM", { locale: es })}
                {' – '}
                {format(draftRange.to, "d 'de' MMMM yyyy", { locale: es })}
              </span>
            ) : (
              'Selecciona un rango de fechas'
            )}
          </div>

          {/* Comparison toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={comparisonEnabled}
              onCheckedChange={setComparisonEnabled}
              className="h-5 w-9 data-[state=checked]:bg-primary/80"
            />
            <span className="text-xs text-muted-foreground">
              Comparar con periodo anterior
            </span>
            {comparisonEnabled && comparisonRange && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                {format(comparisonRange.from, 'dd/MM')} – {format(comparisonRange.to, 'dd/MM/yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs text-muted-foreground hover:text-foreground mr-auto"
          >
            Limpiar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!draftRange.to}
            className="h-7 text-xs"
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export function MetaAdsDateRangePicker({
  value,
  onChange,
  presets,
  align = 'end',
  className,
}: MetaAdsDateRangePickerProps) {
  const timezone = useOrgTimezone();
  const [open, setOpen] = useState(false);

  const presetDefs = presets
    ? DATE_RANGE_PRESETS.filter((p) => presets.includes(p.key))
    : DATE_RANGE_PRESETS.filter((p) => META_ADS_PRESET_KEYS.includes(p.key));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start text-left font-normal gap-2 h-9 border-white/10 bg-white/5 hover:bg-white/10',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatTriggerLabel(value)}</span>
          {value.comparisonEnabled && (
            <span className="text-[10px] text-muted-foreground/60 ml-1">vs anterior</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-white/10 bg-background" align={align} sideOffset={8}>
        <MetaAdsPickerBody
          value={value}
          onChange={onChange}
          presetDefs={presetDefs}
          timezone={timezone}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
