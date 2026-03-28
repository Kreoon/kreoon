import { LayoutGrid, Table2, StretchHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'table' | 'list';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const MODES: { key: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { key: 'cards', icon: LayoutGrid, label: 'Tarjetas' },
  { key: 'table', icon: Table2, label: 'Tabla' },
  { key: 'list', icon: StretchHorizontal, label: 'Lista' },
];

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border border-white/10 bg-white/5 p-0.5',
        className,
      )}
    >
      {MODES.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-all',
            value === key
              ? 'bg-[#8b5cf6] text-white shadow-sm'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
