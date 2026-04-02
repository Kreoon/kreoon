import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/analytics/types/dashboard';

const COLOR_CLASSES: Record<KPIData['color'], string> = {
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  blue:   'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  cyan:   'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
  green:  'from-green-500/20 to-green-500/5 border-green-500/30',
  amber:  'from-amber-500/20 to-amber-500/5 border-amber-500/30',
};

const TREND_ICON_COLOR: Record<KPIData['color'], string> = {
  purple: 'text-purple-400',
  blue:   'text-blue-400',
  cyan:   'text-cyan-400',
  green:  'text-green-400',
  amber:  'text-amber-400',
};

function formatValue(value: number, format: KPIData['format']): string {
  switch (format) {
    case 'currency': return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    case 'percent':  return `${value.toFixed(1)}%`;
    default:         return value.toLocaleString();
  }
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function KPICard({ label, value, previousValue, format, color }: KPIData) {
  const change = calcChange(value, previousValue);
  const isPositive = change > 0;
  const isZero = change === 0;

  return (
    <div className={cn(
      'bg-gradient-to-br rounded-sm p-5 border transition-all hover:scale-[1.02]',
      COLOR_CLASSES[color]
    )}>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{formatValue(value, format)}</p>
      <div className="flex items-center gap-1.5 mt-2">
        {isZero ? (
          <Minus className="h-3.5 w-3.5 text-gray-500" />
        ) : isPositive ? (
          <TrendingUp className={cn('h-3.5 w-3.5', TREND_ICON_COLOR[color])} />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
        )}
        <span className={cn(
          'text-xs font-medium',
          isZero ? 'text-gray-500' : isPositive ? 'text-green-400' : 'text-red-400',
        )}>
          {isZero ? '0%' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}
        </span>
        <span className="text-xs text-gray-600 ml-1">vs periodo anterior</span>
      </div>
    </div>
  );
}
