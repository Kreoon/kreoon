import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatePreset, DateRange } from '@/analytics/types/dashboard';

interface DateRangePickerProps {
  preset: DatePreset;
  dateRange: DateRange;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRange?: (range: DateRange) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

export function DateRangePicker({ preset, onPresetChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
      <Calendar className="h-4 w-4 text-gray-400 ml-2 mr-1" />
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => onPresetChange(p.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            preset === p.value
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
