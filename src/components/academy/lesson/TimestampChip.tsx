import { Play } from 'lucide-react';

interface TimestampChipProps {
  seconds: number;
  label?: string | null;
  onClick?: (seconds: number) => void;
  accentColor?: string;
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TimestampChip({ seconds, label, onClick, accentColor = '#8B5CF6' }: TimestampChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(seconds)}
      title="Saltar a este momento"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors hover:bg-white/5"
      style={{
        borderColor: `${accentColor}40`,
        color: accentColor,
        backgroundColor: `${accentColor}10`,
      }}
    >
      <Play className="h-2.5 w-2.5" /> {label ?? format(seconds)}
    </button>
  );
}
