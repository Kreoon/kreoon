import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyMeterProps {
  energy: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function EnergyMeter({ energy, size = 'md', showLabel = true }: EnergyMeterProps) {
  // Color basado en nivel de energy: rojo bajo, amarillo medio, cyan alto, verde-rayo full
  const color =
    energy >= 80 ? '#22d3ee' :
    energy >= 50 ? '#a78bfa' :
    energy >= 25 ? '#fbbf24' :
    '#ef4444';

  const label =
    energy >= 80 ? 'Cargado' :
    energy >= 50 ? 'Activo' :
    energy >= 25 ? 'Tibio' :
    'Apagado';

  const sizes = {
    sm: { bar: 'h-1.5 w-16', icon: 'h-3 w-3', text: 'text-[10px]' },
    md: { bar: 'h-2 w-24', icon: 'h-3.5 w-3.5', text: 'text-xs' },
    lg: { bar: 'h-3 w-32', icon: 'h-4 w-4', text: 'text-sm' },
  };

  return (
    <div className="inline-flex items-center gap-1.5" title={`Energy: ${energy}/100 — ${label}`}>
      <Zap className={cn(sizes[size].icon, 'flex-shrink-0')} style={{ color }} />
      <div className={cn('relative bg-white/5 rounded-full overflow-hidden', sizes[size].bar)}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${energy}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className={cn(sizes[size].text, 'text-zinc-400 font-mono')}>{energy}</span>
      )}
    </div>
  );
}
