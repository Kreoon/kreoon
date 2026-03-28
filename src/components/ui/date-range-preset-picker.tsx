import { useState, useCallback, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange as DayPickerRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DATE_RANGE_PRESETS,
  resolvePreset,
  getPresetLabel,
  type DateRangePresetKey,
  type DateRangeValue,
  type DateRangePresetDef,
} from '@/lib/date-presets';
import { useOrgTimezone } from '@/hooks/useOrgTimezone';

// ── Props ──

interface DateRangePresetPickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Subset of preset keys to show. Defaults to all. */
  presets?: DateRangePresetKey[];
  /** Render without Popover wrapper (embed inside another container). */
  inline?: boolean;
  /** Popover alignment. */
  align?: 'start' | 'center' | 'end';
  /** Number of calendar months to show. Defaults to 2 (1 on mobile). */
  numberOfMonths?: 1 | 2;
  className?: string;
}

// ── Trigger label ──

function formatTriggerLabel(v: DateRangeValue): string {
  if (v.preset !== 'custom') return getPresetLabel(v.preset);
  const f = format(v.from, 'dd MMM', { locale: es });
  const t = format(v.to, 'dd MMM yyyy', { locale: es });
  return `${f} – ${t}`;
}

// ── Inner body (shared between popover and inline) ──

function PickerBody({
  value,
  onChange,
  presetDefs,
  numberOfMonths = 2,
  inline,
  timezone,
  onClose,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  presetDefs: DateRangePresetDef[];
  numberOfMonths?: 1 | 2;
  inline?: boolean;
  timezone: string;
  onClose?: () => void;
}) {
  // Draft state — only committed on "Aplicar"
  const [draftPreset, setDraftPreset] = useState<DateRangePresetKey>(value.preset);
  const [draftRange, setDraftRange] = useState<{ from: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });

  // Sync draft when external value changes
  useEffect(() => {
    setDraftPreset(value.preset);
    setDraftRange({ from: value.from, to: value.to });
  }, [value.preset, value.from, value.to]);

  const handlePresetClick = useCallback(
    (key: DateRangePresetKey) => {
      if (key === 'custom') {
        setDraftPreset('custom');
        return;
      }
      const resolved = resolvePreset(key, timezone);
      setDraftPreset(key);
      setDraftRange({ from: resolved.from, to: resolved.to });

      // In inline mode, apply immediately on preset click
      if (inline) {
        onChange({ preset: key, from: resolved.from, to: resolved.to });
      }
    },
    [timezone, inline, onChange],
  );

  const handleCalendarSelect = useCallback((range: DayPickerRange | undefined) => {
    if (!range?.from) return;
    setDraftPreset('custom');
    setDraftRange({ from: range.from, to: range.to });
  }, []);

  const handleApply = useCallback(() => {
    if (!draftRange.to) return;
    onChange({ preset: draftPreset, from: draftRange.from, to: draftRange.to });
    onClose?.();
  }, [draftPreset, draftRange, onChange, onClose]);

  const handleCancel = useCallback(() => {
    // Reset draft to current value
    setDraftPreset(value.preset);
    setDraftRange({ from: value.from, to: value.to });
    onClose?.();
  }, [value, onClose]);

  // Responsive months
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const months = isMobile ? 1 : numberOfMonths;

  return (
    <div className="flex flex-col sm:flex-row">
      {/* Preset list */}
      <div className="flex sm:flex-col gap-1 p-2 sm:p-3 sm:w-44 border-b sm:border-b-0 sm:border-r border-border overflow-x-auto sm:overflow-x-visible">
        {presetDefs.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePresetClick(p.key)}
            className={cn(
              'whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-colors text-left shrink-0',
              draftPreset === p.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar + footer */}
      <div className="flex flex-col">
        <Calendar
          mode="range"
          selected={{ from: draftRange.from, to: draftRange.to }}
          onSelect={handleCalendarSelect}
          numberOfMonths={months}
          defaultMonth={draftRange.from}
          className="p-3"
        />

        {/* Footer */}
        {!inline && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {draftRange.from && draftRange.to
                ? `${format(draftRange.from, 'dd/MM/yyyy')} – ${format(draftRange.to, 'dd/MM/yyyy')}`
                : 'Selecciona un rango'}
            </span>
            <div className="flex gap-2">
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
        )}
      </div>
    </div>
  );
}

// ── Main Component ──

export function DateRangePresetPicker({
  value,
  onChange,
  presets,
  inline = false,
  align = 'end',
  numberOfMonths = 2,
  className,
}: DateRangePresetPickerProps) {
  const timezone = useOrgTimezone();
  const [open, setOpen] = useState(false);

  // Filter presets if subset provided
  const presetDefs = presets
    ? DATE_RANGE_PRESETS.filter((p) => presets.includes(p.key))
    : DATE_RANGE_PRESETS;

  // Inline mode: render body directly without Popover
  if (inline) {
    return (
      <PickerBody
        value={value}
        onChange={onChange}
        presetDefs={presetDefs}
        numberOfMonths={numberOfMonths}
        inline
        timezone={timezone}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start text-left font-normal gap-2 h-9',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatTriggerLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} sideOffset={8}>
        <PickerBody
          value={value}
          onChange={onChange}
          presetDefs={presetDefs}
          numberOfMonths={numberOfMonths}
          timezone={timezone}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
